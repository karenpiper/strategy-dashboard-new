'use client'

import { Search, Calendar, Music, FileText, MessageCircle, Trophy, TrendingUp, Users, Zap, Star, Heart, Coffee, Lightbulb, ChevronRight, ChevronLeft, Play, Pause, CheckCircle, Clock, ArrowRight, Video, Sparkles, Loader2, Download, Bot, Info, ExternalLink, User, ChevronDown, ChevronUp, Plus } from 'lucide-react'
import { AccountMenu } from '@/components/account-menu'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ModeSwitcher } from "@/components/mode-switcher"
import { useMode } from "@/contexts/mode-context"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'
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
import { useGoogleCalendarToken } from '@/hooks/useGoogleCalendarToken'

// Force dynamic rendering to avoid SSR issues with context
export const dynamic = 'force-dynamic'

export default function TeamDashboard() {
  const { mode } = useMode()
  const { user, loading: authLoading, signOut } = useAuth()
  const router = useRouter()

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
  }>>([])
  const [workSamplesSearchQuery, setWorkSamplesSearchQuery] = useState('')
  const [horoscopeImage, setHoroscopeImage] = useState<string | null>(null)
  const [horoscopeImagePrompt, setHoroscopeImagePrompt] = useState<string | null>(null)
  const [horoscopeImageSlots, setHoroscopeImageSlots] = useState<any>(null)
  const [horoscopeImageSlotsLabels, setHoroscopeImageSlotsLabels] = useState<any>(null)
  const [horoscopeImageSlotsReasoning, setHoroscopeImageSlotsReasoning] = useState<any>(null)
  const [horoscopeLoading, setHoroscopeLoading] = useState(true)
  const [horoscopeImageLoading, setHoroscopeImageLoading] = useState(true)
  const [horoscopeError, setHoroscopeError] = useState<string | null>(null)
  const [horoscopeImageError, setHoroscopeImageError] = useState<string | null>(null)
  const [userName, setUserName] = useState<string>('Friend')
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
    } | null
    mentioned_user_profile: {
      full_name: string | null
      email: string | null
    } | null
  }>>([])
  const [snapViewType, setSnapViewType] = useState<'received' | 'given'>('received')
  const [showAddSnapDialog, setShowAddSnapDialog] = useState(false)
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
  }>>([])
  const [pipelineLoading, setPipelineLoading] = useState(true)
  const [selectedPipelineProject, setSelectedPipelineProject] = useState<typeof pipelineData[0] | null>(null)
  const [isPipelineDialogOpen, setIsPipelineDialogOpen] = useState(false)
  const [completedFilter, setCompletedFilter] = useState<'Pending Decision' | 'Long Lead' | 'Won' | 'Lost'>('Pending Decision')
  
  // Get Google Calendar access token using the user's existing Google session
  const { accessToken: googleCalendarToken, loading: tokenLoading, error: tokenError } = useGoogleCalendarToken()

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
  
  // Detect user timezone and calculate timezone times
  useEffect(() => {
    // Detect user's timezone
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
          setUserTimeZone(label)
          break
        }
      }
      
      // If no exact match, try to infer from offset
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
      if (!userTimeZone) {
        setUserTimeZone(closest[1])
      }
    } catch (error) {
      console.error('Error detecting timezone:', error)
    }
    
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
  }, [userTimeZone])
  
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

  // Fetch user's calendars dynamically (if token is available)
  useEffect(() => {
    async function fetchUserCalendars() {
      if (!googleCalendarToken || tokenLoading) return
      
      try {
        const response = await fetch(
          `/api/calendars/list?accessToken=${encodeURIComponent(googleCalendarToken)}`
        )
        
        if (response.ok) {
          const result = await response.json()
          if (result.calendars && Array.isArray(result.calendars)) {
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
              console.log(`Using ${filteredCalendars.length} dynamically fetched calendars:`, filteredCalendars)
            } else if (filteredCalendars.length > 0) {
              console.log(`Found ${filteredCalendars.length} accessible calendars (not using - enable useDynamicCalendars to use them)`)
            }
          }
        }
      } catch (error) {
        console.error('Error fetching user calendars:', error)
      }
    }
    
    fetchUserCalendars()
  }, [googleCalendarToken, tokenLoading, useDynamicCalendars])

  // Fetch calendar events
  useEffect(() => {
    async function fetchCalendarEvents() {
      // Don't wait for token - proceed immediately
      // If token becomes available later, it will be used on next fetch
      // This ensures calendar loads even if popup is blocked
      if (tokenLoading && !googleCalendarToken && !tokenError) {
        console.log('⏳ Token is loading, but proceeding with fallback authentication...')
      }

      try {
        setCalendarLoading(true)
        setCalendarError(null)

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
          console.log('✅ Using Google OAuth token for calendar access')
        } else {
          console.warn('⚠️ No Google OAuth token available - will use service account or fallback auth')
          if (tokenError) {
            console.error('Token error:', tokenError)
          }
        }
        
        const response = await fetch(apiUrl)

        if (response.ok) {
          const result = await response.json()
          console.log('Calendar API response:', { 
            eventCount: result.count, 
            events: result.events,
            successfulCalendars: result.successfulCalendars,
            failedCalendars: result.failedCalendars,
            failedDetails: result.failedCalendarDetails
          })
          
          if (result.failedCalendars > 0) {
            console.warn(`${result.failedCalendars} calendar(s) failed to load. Check server logs for details.`)
            const failedDetails = result.failedCalendarDetails || []
            const failedMessages = failedDetails.map((f: any) => `${f.id}: ${f.error}`).join('; ')
            if (result.count === 0) {
              // Only show error if no events were loaded at all
              setCalendarError(`Some calendars are not accessible. ${failedMessages}`)
            }
          }
          
          if (result.authInfo) {
            setServiceAccountEmail(result.authInfo)
            console.log(`Authentication method: ${result.usingOAuth2 ? 'OAuth2' : 'Service Account'}`)
            console.log(`Auth info: ${result.authInfo}`)
          }
          
          if (result.events && Array.isArray(result.events)) {
            setCalendarEvents(result.events)
            console.log(`Loaded ${result.events.length} calendar events from ${result.successfulCalendars} calendar(s)`)
          } else {
            console.warn('No events array in response:', result)
            setCalendarEvents([])
          }
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
          console.error('Calendar API error:', errorData)
          setCalendarError(errorData.error || 'Failed to fetch calendar events')
        }
      } catch (error: any) {
        console.error('Error fetching calendar events:', error)
        setCalendarError(error.message || 'Failed to load calendar events')
      } finally {
        setCalendarLoading(false)
      }
    }

    // Fetch events immediately - don't wait for token
    // Token will be used if available, otherwise falls back to service account
    fetchCalendarEvents()
  }, [user, eventsExpanded, googleCalendarToken, tokenLoading, tokenError, calendarIds])

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
  useEffect(() => {
    let isMounted = true // Prevent state updates if component unmounts
    let isFetching = false // Prevent multiple simultaneous requests
    
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

      // Prevent multiple simultaneous requests
      if (isFetching) {
        console.log('⏸️ Request already in progress, skipping duplicate request')
        return
      }
      
      isFetching = true

      // Don't redirect to profile setup from here - let the API handle it
      console.log('Fetching horoscope data for authenticated user...')

      if (isMounted) {
        setHoroscopeLoading(true)
        setHoroscopeImageLoading(true)
        setHoroscopeError(null)
        setHoroscopeImageError(null)
      }
      
      try {
        // Fetch both text and image in parallel for faster loading
        const [textResponse, imageResponse] = await Promise.all([
          fetch('/api/horoscope'),
          fetch('/api/horoscope/avatar')
        ])
        
        if (!isMounted) {
          isFetching = false
          return // Don't process if component unmounted
        }
        
        // Process text response
        const textData = await textResponse.json()
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
          // Only set today's horoscope - historical horoscopes remain in database
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
        }
        
        // Process image response
        const imageData = await imageResponse.json()
        if (!imageResponse.ok) {
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
        } else {
          console.log('Horoscope image received:', imageData)
          console.log('Reasoning received:', imageData.prompt_slots_reasoning)
          // Only set today's image - historical images remain in database
          setHoroscopeImage(imageData.image_url)
          setHoroscopeImagePrompt(imageData.image_prompt || null)
          setHoroscopeImageSlots(imageData.prompt_slots || null)
          setHoroscopeImageSlotsLabels(imageData.prompt_slots_labels || null)
          setHoroscopeImageSlotsReasoning(imageData.prompt_slots_reasoning || null)
          console.log('Reasoning state set to:', imageData.prompt_slots_reasoning)
        }
      } catch (error: any) {
        console.error('Error fetching horoscope data:', error)
        setHoroscopeError('Failed to load horoscope: ' + (error.message || 'Unknown error'))
        setHoroscopeImageError('Failed to load horoscope image: ' + (error.message || 'Unknown error'))
      } finally {
        isFetching = false // Reset fetching flag
        if (isMounted) {
          setHoroscopeLoading(false)
          setHoroscopeImageLoading(false)
        }
      }
    }
    
    fetchHoroscopeData()
    
    return () => {
      isMounted = false // Cleanup on unmount
      isFetching = false // Reset fetching flag
    }
  }, [user])

  // Comprehensive mode-aware card styling
  type CardSection = 'hero' | 'recognition' | 'work' | 'team' | 'vibes' | 'community' | 'default'
  type SpecificCard = 'hero-large' | 'launch-pad' | 'horoscope' | 'timezones' | 'playlist' | 'friday-drop' | 'brand-redesign' | 'stats' | 'events' | 'pipeline' | 'who-needs-what' | 'snaps' | 'beast-babe' | 'wins-wall' | 'ask-hive' | 'team-pulse' | 'loom-standup' | 'inspiration-war' | 'search'
  
  const getSpecificCardStyle = (cardName: SpecificCard): { bg: string; border: string; glow: string; text: string; accent: string } => {
    if (mode === 'chaos') {
      const chaosCardStyles: Record<SpecificCard, { bg: string; border: string; glow: string; text: string; accent: string }> = {
        'hero-large': { bg: 'bg-gradient-to-br from-[#FFE500] via-[#FF8C00] to-[#FF6B6B]', border: 'border-0', glow: '', text: 'text-black', accent: '#FFE500' },
        'launch-pad': { bg: 'bg-gradient-to-br from-[#9D4EFF] to-[#6B2C91]', border: 'border-0', glow: '', text: 'text-white', accent: '#C4F500' },
        'horoscope': { bg: 'bg-[#6B2C91]', border: 'border-0', glow: '', text: 'text-white', accent: '#FFE500' },
        'timezones': { bg: 'bg-[#000000]', border: 'border-0', glow: '', text: 'text-white', accent: '#00D4FF' },
        'playlist': { bg: 'bg-gradient-to-br from-[#FF6B00] to-[#FF8A00]', border: 'border-0', glow: '', text: 'text-white', accent: '#FF00FF' },
        'friday-drop': { bg: 'bg-[#40E0D0]', border: 'border-0', glow: '', text: 'text-black', accent: '#000000' }, // Turquoise with black
        'brand-redesign': { bg: 'bg-[#FF69B4]', border: 'border-0', glow: '', text: 'text-black', accent: '#000000' }, // Pink with black
        'stats': { bg: 'bg-white', border: 'border-0', glow: '', text: 'text-black', accent: '#00FF87' }, // White with black and mint highlight
        'events': { bg: 'bg-[#000000]', border: 'border-2', glow: '', text: 'text-white', accent: '#00FF87' }, // Black with mint and outline
        'pipeline': { bg: 'bg-[#00FF87]', border: 'border-0', glow: '', text: 'text-black', accent: '#000000' }, // Mint with black
        'who-needs-what': { bg: 'bg-[#E8FF00]', border: 'border-0', glow: '', text: 'text-black', accent: '#000000' }, // Yellow with black
        'snaps': { bg: 'bg-[#000000]', border: 'border-0', glow: '', text: 'text-white', accent: '#E8FF00' },
        'beast-babe': { bg: 'bg-gradient-to-br from-[#FF0055] to-[#FF4081]', border: 'border-0', glow: '', text: 'text-white', accent: '#E8FF00' },
        'wins-wall': { bg: 'bg-gradient-to-br from-[#00B8D4] to-[#0066CC]', border: 'border-0', glow: '', text: 'text-white', accent: '#00D4FF' },
        'ask-hive': { bg: 'bg-gradient-to-br from-[#9D4EFF] to-[#7B2CBE]', border: 'border-0', glow: '', text: 'text-white', accent: '#9D4EFF' },
        'team-pulse': { bg: 'bg-white', border: 'border-0', glow: '', text: 'text-black', accent: '#00FF87' },
        'loom-standup': { bg: 'bg-gradient-to-br from-[#2979FF] to-[#7B1FA2]', border: 'border-0', glow: '', text: 'text-white', accent: '#00D4FF' },
        'inspiration-war': { bg: 'bg-[#E8FF00]', border: 'border-0', glow: '', text: 'text-black', accent: '#C4F500' },
        'search': { bg: 'bg-[#000000]', border: 'border border-[#E8FF00]', glow: '', text: 'text-white', accent: '#E8FF00' },
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
                         cardName === 'timezones' || cardName === 'team-pulse' || cardName === 'loom-standup' ? 'team' :
                         cardName === 'horoscope' || cardName === 'playlist' || cardName === 'brand-redesign' || cardName === 'inspiration-war' ? 'vibes' :
                         'community')
    }
  }
  
  const getCardStyle = (section: CardSection): { bg: string; border: string; glow: string; text: string; accent: string } => {
    if (mode === 'chaos') {
      // Fallback for section-based styling in chaos mode
      const chaosColors: Record<CardSection, { bg: string; border: string; glow: string; text: string; accent: string }> = {
        hero: { bg: 'bg-gradient-to-br from-[#FFB84D] via-[#FFE500] to-[#FFE500]', border: 'border-0', glow: '', text: 'text-black', accent: '#C4F500' },
        recognition: { bg: 'bg-[#000000]', border: 'border-0', glow: '', text: 'text-white', accent: '#00FF87' },
        work: { bg: 'bg-gradient-to-br from-[#00B8D4] to-[#0066CC]', border: 'border-0', glow: '', text: 'text-white', accent: '#FF6B00' },
        team: { bg: 'bg-gradient-to-br from-[#00B8D4] to-[#0066CC]', border: 'border-0', glow: '', text: 'text-white', accent: '#00D4FF' },
        vibes: { bg: 'bg-gradient-to-br from-[#9D4EFF] to-[#6B2C91]', border: 'border-0', glow: '', text: 'text-white', accent: '#FF00FF' },
        community: { bg: 'bg-gradient-to-br from-[#FF4081] to-[#E91E63]', border: 'border-0', glow: '', text: 'text-white', accent: '#9D4EFF' },
        default: { bg: 'bg-[#000000]', border: 'border-0', glow: '', text: 'text-white', accent: '#C4F500' },
      }
      return chaosColors[section] || chaosColors.default
    } else if (mode === 'chill') {
      const chillColors: Record<CardSection, { bg: string; border: string; glow: string; text: string; accent: string }> = {
        hero: { bg: 'bg-gradient-to-br from-[#FFC043] via-[#FFB5D8] to-[#C8D961]', border: 'border border-[#FFC043]/30', glow: '', text: 'text-[#4A1818]', accent: '#FFC043' },
        recognition: { bg: 'bg-white', border: 'border border-[#C8D961]/30', glow: '', text: 'text-[#4A1818]', accent: '#C8D961' },
        work: { bg: 'bg-white', border: 'border border-[#FF6B35]/30', glow: '', text: 'text-[#4A1818]', accent: '#FF6B35' },
        team: { bg: 'bg-white', border: 'border border-[#4A9BFF]/30', glow: '', text: 'text-[#4A1818]', accent: '#4A9BFF' },
        vibes: { bg: 'bg-white', border: 'border border-[#FFB5D8]/30', glow: '', text: 'text-[#4A1818]', accent: '#FFB5D8' },
        community: { bg: 'bg-white', border: 'border border-[#8B4444]/30', glow: '', text: 'text-[#4A1818]', accent: '#8B4444' },
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
        default: { bg: 'bg-[#000000]', border: 'border border-[#FFFFFF]', glow: '', text: 'text-[#FFFFFF]', accent: '#FFFFFF' },
      }
      return codeColors[section] || codeColors.default
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

  const getBorderClass = () => {
    switch (mode) {
      case 'chaos': return 'border-[#333333]'
      case 'chill': return 'border-[#4A1818]/20'
      case 'code': return 'border-[#FFFFFF]'
      default: return 'border-[#333333]'
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

  return (
    <div className={`min-h-screen ${getBgClass()} ${getTextClass()} ${mode === 'code' ? 'font-mono' : 'font-[family-name:var(--font-raleway)]'}`}>
      <header className={`border-b ${getBorderClass()} px-6 py-4`}>
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className={`w-10 h-10 ${getLogoBg()} ${getLogoText()} ${getRoundedClass('rounded-xl')} flex items-center justify-center font-black text-lg ${mode === 'code' ? 'font-mono' : ''}`}>
              {mode === 'code' ? 'C:\\>' : 'D'}
            </div>
            <nav className="flex items-center gap-6">
              <a href="#" className={getNavLinkClass(true)}>HOME</a>
              <Link href="/vibes" className={getNavLinkClass()}>SNAPS</Link>
              <a href="#" className={getNavLinkClass()}>RESOURCES</a>
              <Link href="/work-samples" className={getNavLinkClass()}>WORK</Link>
              <a href="#" className={getNavLinkClass()}>TEAM</a>
              <Link href="/vibes" className={getNavLinkClass()}>VIBES</Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            {/* Horoscope Image Actions - Tooltip and Download */}
            {horoscopeImage && (
              <TooltipProvider>
                <div className="flex items-center gap-2">
                  {(horoscopeImageSlotsLabels || horoscopeImagePrompt) && (
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
                  >
                    <Download className={`w-4 h-4 ${
                      mode === 'chaos' ? 'text-[#C4F500]' :
                      mode === 'chill' ? 'text-[#FFC043]' :
                      'text-white'
                    }`} />
                  </button>
                </div>
              </TooltipProvider>
            )}
            <ModeSwitcher />
            {user && (
              <AccountMenu />
            )}
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-10">
        {/* Hero Section - Full Width */}
        <section className="mb-12">
          {(() => {
            const style = mode === 'chaos' ? getSpecificCardStyle('hero-large') : getCardStyle('hero')
            return (
              <Card className={`${style.bg} ${style.border} p-0 ${mode === 'chaos' ? getRoundedClass('rounded-[2.5rem]') : getRoundedClass('rounded-[2.5rem]')} relative overflow-hidden group min-h-[500px] flex flex-col justify-between`}
                    style={style.glow ? { boxShadow: `0 0 40px ${style.glow}` } : {}}
              >
                {/* Black masked section on the right with transform/rotation - contains horoscope image */}
                {mode === 'chaos' && (
                  <div className={`absolute top-0 right-0 w-1/2 h-full ${getBgClass()} ${getRoundedClass('rounded-[2.5rem]')} transform translate-x-1/4 -rotate-12 overflow-hidden`}>
                    {horoscopeImageLoading ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-white" />
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
                  <div className={`absolute top-0 right-0 w-[60%] h-full ${getBgClass()} overflow-hidden`} 
                       style={{ clipPath: 'polygon(12% 0, 100% 0, 100% 100%, 0% 100%)' }} 
                  >
                    {horoscopeImageLoading ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-white" />
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
                <div className="relative z-10 p-8 md:p-12 h-full flex flex-col justify-between">
                  <div>
                    <Badge className={`${mode === 'chaos' ? 'bg-black text-[#FFE500]' : mode === 'chill' ? 'bg-[#4A1818] text-[#FFC043]' : mode === 'code' ? 'bg-[#FFFFFF] text-black border border-[#FFFFFF]' : 'bg-white text-black'} hover:opacity-90 ${mode === 'code' ? 'border-0' : 'border-0'} ${getRoundedClass('rounded-full')} font-black mb-4 md:mb-6 text-xs md:text-sm uppercase tracking-[0.2em] ${mode === 'code' ? 'font-mono' : ''} px-4 md:px-6 py-2 md:py-3`}>
                      {mode === 'code' ? '[AI CHAOS AGENT]' : mode === 'chaos' ? 'QUICK ACTIONS' : 'AI Chaos Agent'}
                    </Badge>
                    <h1 className={`text-[clamp(3rem,8vw+1rem,10rem)] font-black mb-4 md:mb-6 leading-[0.85] tracking-tight uppercase text-black ${mode === 'code' ? 'font-mono' : ''}`}>
                      {mode === 'code' ? `> Hello, ${userName}` : `Hello, ${userName}`}
                    </h1>
                    <p className={`text-[clamp(1.25rem,3vw+0.5rem,2.5rem)] font-bold max-w-2xl leading-tight text-black ${mode === 'code' ? 'font-mono' : ''}`}>
                      {mode === 'code' ? ':: Let\'s ship something amazing today' : 'Let\'s ship something amazing today'}
                    </p>
                    <p className={`text-base md:text-lg lg:text-xl font-bold mt-4 text-black/70 ${mode === 'code' ? 'font-mono' : ''}`}>
                      {mode === 'code' ? `C:\\> date: ${todayDate || 'Loading...'}` : todayDate || 'Loading...'}
                    </p>
                  </div>
                  <div className="relative z-10 flex items-center gap-3 md:gap-4 flex-wrap">
                    {['Give Snap', 'Need Help', 'Add Win'].map((label) => (
                      <Button key={label} className={`${mode === 'chaos' ? 'bg-black text-[#FFE500] hover:bg-[#0F0F0F] hover:scale-105' : mode === 'chill' ? 'bg-[#4A1818] text-[#FFC043] hover:bg-[#3A1414]' : mode === 'code' ? 'bg-[#FFFFFF] text-black border border-[#FFFFFF] hover:bg-[#CCCCCC]' : 'bg-white text-black hover:bg-[#e5e5e5]'} font-black ${getRoundedClass('rounded-full')} py-3 md:py-4 px-6 md:px-8 text-base md:text-lg uppercase tracking-wider transition-all hover:shadow-2xl ${mode === 'code' ? 'font-mono' : ''}`}>
                        {mode === 'code' ? `[${label.toUpperCase().replace(' ', ' ')}]` : label} {mode !== 'code' && <ArrowRight className="w-4 h-4 ml-2" />}
                  </Button>
                    ))}
                </div>
              </div>
            </Card>
            )
          })()}
        </section>

        {/* Time Zones - 100% width, very short, between hero and horoscope */}
        <section className="mb-6">
          {(() => {
            const style = mode === 'chaos' ? getSpecificCardStyle('timezones') : getCardStyle('team')
            const timeZoneColors = mode === 'chaos' 
              ? ['#00FF87', '#4A9BFF', '#00D4FF', '#9D4EFF', '#FF6B6B', '#FFD93D', '#6BCF7F']
              : mode === 'chill'
              ? ['#C8D961', '#4A9BFF', '#00D4FF', '#9D4EFF', '#FFB84D', '#FFD93D', '#A8E6CF']
              : ['#cccccc', '#e5e5e5', '#999999', '#cccccc', '#b3b3b3', '#d9d9d9', '#e5e5e5']
            
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
                          isUserTz 
                            ? mode === 'chaos' 
                              ? 'ring-2 ring-[#C4F500] ring-offset-2 ring-offset-black' 
                              : mode === 'chill'
                              ? 'ring-2 ring-[#FFC043] ring-offset-2 ring-offset-[#F5E6D3]'
                              : 'ring-2 ring-[#FFFFFF] ring-offset-2 ring-offset-black'
                            : ''
                        }`}
                        style={{
                          backgroundColor: isUserTz ? timeZoneColors[idx] : '#333333',
                          boxShadow: isUserTz 
                            ? mode === 'chaos' 
                              ? '0 0 10px rgba(196, 245, 0, 0.5)' 
                              : mode === 'chill'
                              ? '0 0 10px rgba(255, 192, 67, 0.5)'
                              : '0 0 10px rgba(0, 255, 0, 0.5)'
                            : 'none',
                        } as React.CSSProperties}
                      >
                        <span className="text-2xl flex-shrink-0">{emojiMap[tz.label] || '🌍'}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`font-black text-xs truncate ${
                            isUserTz 
                              ? mode === 'chaos' ? 'text-black' : 'text-white'
                              : 'text-white'
                          }`}>
                            {tz.label}
                          </p>
                          <p className={`text-xs font-medium truncate ${
                            isUserTz 
                              ? mode === 'chaos' ? 'text-black/70' : 'text-white/80'
                              : 'text-white/80'
                          }`}>
                            {tz.time}
                          </p>
                          {isUserTz && (
                            <p className={`text-[10px] font-bold mt-0.5 ${mode === 'chaos' ? 'text-black/80' : 'text-white/90'}`}>
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
              <span className="text-[#808080]">PERSONALIZED INFORMATION</span>
              <span className="text-[#FFFFFF]">════════════════════════════════════════</span>
            </>
          ) : (
            <>
              <span className={`w-8 h-px ${mode === 'chaos' ? 'bg-[#333333]' : mode === 'chill' ? 'bg-[#8B4444]/30' : 'bg-[#333333]'}`}></span>
          Personalized Information
            </>
          )}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 relative">
          {/* Centered Divider Line - 40% height, vertically centered */}
          <div className="hidden md:block absolute left-[calc(66.666%+48px)] top-1/2 -translate-y-1/2 h-[40%] w-px bg-white"></div>
          
          {/* Horoscope - 2 columns */}
          {(() => {
            const style = mode === 'chaos' ? getSpecificCardStyle('horoscope') : getCardStyle('vibes')
            return (
              <Card className={`${style.bg} ${style.border} p-6 ${getRoundedClass('rounded-[2.5rem]')} md:col-span-2`}
                    style={style.glow ? { boxShadow: `0 0 40px ${style.glow}` } : {}}
              >
                  <div className="flex items-center gap-2 text-sm mb-3" style={{ color: style.accent }}>
                <Sparkles className="w-4 h-4" />
                    <span className="uppercase tracking-wider font-black text-xs">Your Horoscope</span>
              </div>
                  {characterName ? (
                    <h2 className={`text-4xl font-black mb-6 uppercase`} style={{ color: style.accent }}>
                      {mode === 'code' ? `:: Today you're giving '${characterName}'` : `Today you're giving '${characterName}'`}
                    </h2>
                  ) : (
                    <h2 className={`text-4xl font-black mb-6 uppercase`} style={{ color: style.accent }}>YOUR<br/>HOROSCOPE</h2>
                  )}
                  
                  {horoscopeLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className={`w-6 h-6 animate-spin ${style.text}`} />
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

          {/* Right Column: Playlist */}
          {(() => {
            const [isPlaying, setIsPlaying] = useState(false)
            
            // Example playlist data - replace with actual Spotify API data
            const playlistData: PlaylistData = {
              title: 'Halloween Prom',
              curator: 'Rebecca Smith',
              curatorPhotoUrl: '/placeholder-user.jpg',
              coverUrl: 'https://i.scdn.co/image/ab67616d0000b273c5649add07ed3720be9d5526',
              description: 'macabre mingling, bone-chilling bops, spooky sl dances, and spiked punch - vampy vibes include',
              spotifyUrl: 'https://open.spotify.com/playlist/example',
              trackCount: 20,
              totalDuration: '73:48',
              tracks: [
                { name: 'Thriller', artist: 'Michael Jackson', duration: '5:57' },
                { name: 'Monster Mash', artist: 'Bobby Pickett', duration: '3:12' },
                { name: 'Ghostbusters', artist: 'Ray Parker Jr.', duration: '4:05' },
                { name: 'This Is Halloween', artist: 'Danny Elfman', duration: '3:16' },
                { name: 'Time Warp', artist: 'Richard O\'Brien', duration: '3:19' },
                { name: 'Somebody\'s Watching Me', artist: 'Rockwell', duration: '3:57' },
                { name: 'Bad Moon Rising', artist: 'Creedence Clearwater Revival', duration: '2:21' },
                { name: 'I Put a Spell on You', artist: 'Screamin\' Jay Hawkins', duration: '2:24' },
                { name: 'Witch Doctor', artist: 'David Seville', duration: '2:25' },
                { name: 'The Addams Family Theme', artist: 'Vic Mizzy', duration: '1:49' },
              ],
            }
            
            return (
              <div className="pl-[50px]">
                <SpotifyPlayer
                  playlist={playlistData}
                  isPlaying={isPlaying}
                  onPlayPause={() => setIsPlaying(!isPlaying)}
                />
              </div>
            )
          })()}
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
            </>
          )}
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12 items-stretch">
          <div className="space-y-6">
            {/* Beast Babe */}
            {(() => {
              const style = mode === 'chaos' ? getSpecificCardStyle('beast-babe') : getCardStyle('recognition')
              return (
                <Card className={`${style.bg} ${style.border} p-6 ${getRoundedClass('rounded-[2.5rem]')}`}
                      style={style.glow ? { boxShadow: `0 0 40px ${style.glow}` } : {}}
                >
                  <p className="text-xs uppercase tracking-wider mb-2 font-black" style={{ color: style.accent }}>This Week's</p>
                  <h2 className={`text-4xl font-black mb-6 uppercase ${style.text}`}>BEAST<br/>BABE</h2>
              <div className="flex items-center justify-center mb-4">
                    <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: style.accent }}>
                      <Trophy className={`w-10 h-10 ${mode === 'chill' ? 'text-[#4A1818]' : 'text-black'}`} />
                </div>
              </div>
                  <p className={`text-2xl font-black text-center ${style.text}`}>Sarah J.</p>
                  <p className={`text-sm text-center font-medium ${style.text}/80`}>42 Snaps Received</p>
            </Card>
              )
            })()}

            {/* Wins Wall */}
            {(() => {
              const style = getSpecificCardStyle('wins-wall')
              const wins = [
                { name: 'Alex Chen', win: 'Closed $50k deal!', emoji: '🎉' },
                { name: 'Jamie Park', win: 'Shipped v2.0!', emoji: '🚀' },
                { name: 'Alex Chen', win: 'Closed $50k deal!', emoji: '⭐' },
              ]
              return (
                <Card className={`${style.bg} ${style.border} p-6 ${getRoundedClass('rounded-[2.5rem]')}`}
                      style={style.glow ? { boxShadow: `0 0 40px ${style.glow}` } : {}}
                >
                  <div className="flex items-center gap-2 text-sm mb-2" style={{ color: style.accent }}>
                <Trophy className="w-4 h-4" />
                    <span className="uppercase tracking-wider font-black text-xs">Celebrate</span>
              </div>
                  <h2 className={`text-4xl font-black mb-4 uppercase ${style.text}`}>WINS<br/>WALL</h2>
              <div className="space-y-2 mb-4">
                    {wins.map((win, idx) => (
                      <div key={idx} className={`${mode === 'chaos' ? 'bg-black/40' : mode === 'chill' ? 'bg-[#F5E6D3]/30' : 'bg-black/40'} rounded-xl p-3 border-2`} style={{ borderColor: `${style.accent}66` }}>
                        <div className="flex items-center justify-between">
                  <div>
                            <p className={`text-sm font-black ${style.text}`}>{win.name}</p>
                            <p className={`text-xs font-medium ${style.text}/70`}>{win.win}</p>
                  </div>
                          <span className="text-2xl">{win.emoji}</span>
                </div>
                  </div>
                    ))}
                </div>
                  <Button className={`w-full ${mode === 'chaos' ? 'bg-black text-[#00FF87] hover:bg-[#0F0F0F]' : mode === 'chill' ? 'bg-[#4A1818] text-[#C8D961] hover:bg-[#3A1414]' : 'bg-white text-black hover:bg-[#e5e5e5]'} font-black rounded-full h-12 uppercase`}>
                Share Win
              </Button>
            </Card>
              )
            })()}
          </div>

          {/* Snaps */}
          {(() => {
            const style = mode === 'chaos' ? getSpecificCardStyle('snaps') : getCardStyle('recognition')
            return (
              <Card className={`lg:col-span-2 ${style.bg} ${style.border} p-8 ${getRoundedClass('rounded-[2.5rem]')} h-full flex flex-col`}
                    style={style.glow ? { boxShadow: `0 0 40px ${style.glow}` } : {}}
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
                            ? 'bg-[#E8FF00] text-black'
                            : mode === 'chill'
                            ? 'bg-[#FFB5D8] text-[#4A1818]'
                            : 'bg-white text-black'
                          : mode === 'chaos'
                          ? 'bg-black/40 text-[#E8FF00]/60 border border-[#E8FF00]/40'
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
                            ? 'bg-[#E8FF00] text-black'
                            : mode === 'chill'
                            ? 'bg-[#FFB5D8] text-[#4A1818]'
                            : 'bg-white text-black'
                          : mode === 'chaos'
                          ? 'bg-black/40 text-[#E8FF00]/60 border border-[#E8FF00]/40'
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
                      <Button className={`${mode === 'chaos' ? 'bg-black/40 hover:bg-black/60 border-2 border-[#E8FF00] text-[#E8FF00]' : mode === 'chill' ? 'bg-[#F5E6D3]/30 hover:bg-[#F5E6D3]/50 border-2 border-[#FFB5D8] text-[#4A1818]' : 'bg-black/40 hover:bg-black/60 border-2 border-white text-white'} font-black rounded-full h-10 px-6 text-sm uppercase`}>
                        VIEW ALL
                      </Button>
                    </Link>
                    <Button 
                      onClick={() => setShowAddSnapDialog(true)}
                      className={`${mode === 'chaos' ? 'bg-gradient-to-r from-[#00FF87] to-[#00E676] hover:from-[#00FF87] hover:to-[#00FF87] text-black' : mode === 'chill' ? 'bg-gradient-to-r from-[#C8D961] to-[#FFC043] hover:from-[#C8D961] hover:to-[#C8D961] text-[#4A1818]' : 'bg-gradient-to-r from-[#cccccc] to-[#e5e5e5] hover:from-[#cccccc] hover:to-[#cccccc] text-black'} font-black rounded-full h-10 px-6 text-sm uppercase`}
                    >
                      + GIVE A SNAP
                    </Button>
                  </div>
                </div>
                <div className="space-y-[22px] mb-6 mt-2">
                  {snaps.length === 0 ? (
                    <div className={`${mode === 'chaos' ? 'bg-black/40 backdrop-blur-sm' : mode === 'chill' ? 'bg-[#F5E6D3]/30' : 'bg-black/40'} rounded-xl p-5 border-2`} style={{ borderColor: `${style.accent}66` }}>
                      <p className={`text-sm ${style.text}/80 text-center`}>No snaps yet. Be the first to recognize someone!</p>
                    </div>
                  ) : (
                    snaps.map((snap, idx) => {
                      const senderName = snap.submitted_by_profile?.full_name || snap.submitted_by_profile?.email || null
                      const recipientName = snap.mentioned_user_profile?.full_name || snap.mentioned_user_profile?.email || snap.mentioned || 'Team'
                      return (
                        <div key={snap.id} className={`${mode === 'chaos' ? 'bg-black/40 backdrop-blur-sm' : mode === 'chill' ? 'bg-[#F5E6D3]/30' : 'bg-black/40'} rounded-xl p-3 border-2 transition-all hover:opacity-80 relative`} style={{ borderColor: `${style.accent}66`, borderLeftWidth: '10px', borderLeftColor: style.accent }}>
                          <div className="flex-1">
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
            </>
          )}
        </p>

        <div className={`grid grid-cols-1 md:grid-cols-4 gap-6 mb-12`}>
          {/* Events */}
          {(() => {
            const style = mode === 'chaos' ? getSpecificCardStyle('events') : getCardStyle('work')
            const mintColor = '#00FF87'
            
            // Filter events for today or week view
            const now = new Date()
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
            const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)
            const weekEnd = new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000)
            
            // Filter events and deduplicate
            const filteredEvents = calendarEvents
              .filter(event => {
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
                  
                  // Only show events that start today
                  return eventStart >= todayStart && eventStart < todayEnd
                }
              })
              // Deduplicate events - same event might appear in multiple calendars
              // Use a Map to track seen events by a unique key
              .filter((event, index, self) => {
                // Create a unique key from summary, start, and end
                const eventStart = event.start.dateTime || event.start.date || ''
                const eventEnd = event.end.dateTime || event.end.date || ''
                const eventKey = `${event.summary}|${eventStart}|${eventEnd}`
                
                // Find first occurrence of this key
                const firstIndex = self.findIndex(e => {
                  const eStart = e.start.dateTime || e.start.date || ''
                  const eEnd = e.end.dateTime || e.end.date || ''
                  const eKey = `${e.summary}|${eStart}|${eEnd}`
                  return eKey === eventKey
                })
                
                // Only keep the first occurrence
                return firstIndex === index
              })
              // Sort by start time
              .sort((a, b) => {
                const aStart = a.start.dateTime ? new Date(a.start.dateTime) : new Date(a.start.date || 0)
                const bStart = b.start.dateTime ? new Date(b.start.dateTime) : new Date(b.start.date || 0)
                return aStart.getTime() - bStart.getTime()
              })

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
            const getEventColor = (event: typeof calendarEvents[0]) => {
              const calendarId = event.calendarId
              
              // Out of office (both calendars)
              if (calendarId.includes('6elnqlt8ok3kmcpim2vge0qqqk') || calendarId.includes('ojeuiov0bhit2k17g8d6gj4i68')) {
                return '#FF6B6B' // Red
              }
              
              // Strategy team
              if (calendarId.includes('6236655ee40ad4fcbedc4e96ce72c39783f27645dbdd22714ca9bc90fcc551ac')) {
                return '#9D4EFF' // Purple
              }
              
              // Holidays
              if (calendarId.includes('holiday')) {
                return '#FFC043' // Yellow/Orange
              }
              
              // Office events (default)
              return '#00FF87' // Mint/Green
            }

            // Generate week days for Gantt chart
            const getWeekDays = () => {
              const days = []
              const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
              for (let i = 0; i < 7; i++) {
                const day = new Date(today)
                day.setDate(today.getDate() + i)
                days.push(day)
              }
              return days
            }

            // Calculate event span across days
            const getEventSpan = (event: typeof calendarEvents[0]) => {
              const start = event.start.dateTime 
                ? new Date(event.start.dateTime)
                : event.start.date
                  ? new Date(event.start.date)
                  : null
              
              let end = event.end.dateTime 
                ? new Date(event.end.dateTime)
                : event.end.date
                  ? new Date(event.end.date)
                  : null
              
              if (!start) return { startDay: 0, endDay: 0, isMultiDay: false }
              
              // For all-day events, Google Calendar uses exclusive end dates (next day)
              // So we need to subtract 1 day to get the actual last day
              if (event.end.date && end) {
                end = new Date(end.getTime() - 24 * 60 * 60 * 1000)
              }
              
              if (!end) end = start
              
              const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
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
              <Card className={`${style.bg} ${style.border} p-6 ${getRoundedClass('rounded-[2.5rem]')} ${eventsExpanded ? 'md:col-span-3' : ''}`}
                    style={style.glow ? { boxShadow: `0 0 40px ${style.glow}` } : { borderColor: style.accent }}
              >
                <div className="flex items-center justify-between mb-4">
                  <p className={`text-xs uppercase tracking-wider font-black`} style={{ color: mintColor }}>
                    {eventsExpanded ? 'THIS WEEK' : 'TODAY'}
                  </p>
                  <button
                    onClick={() => setEventsExpanded(!eventsExpanded)}
                    className={`${getRoundedClass('rounded-lg')} px-3 py-1.5 flex items-center gap-1 text-xs font-black transition-all`}
                    style={{ 
                      backgroundColor: `${mintColor}33`,
                      color: mintColor
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
                <h2 className={`text-3xl font-black mb-6 uppercase ${style.text}`}>EVENTS</h2>
                
                {calendarLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className={`w-6 h-6 animate-spin ${style.text}`} />
                  </div>
                ) : calendarError ? (
                  <div className={`${getRoundedClass('rounded-lg')} p-4 space-y-2`} style={{ backgroundColor: `${mintColor}33` }}>
                    <p className={`text-sm font-black ${style.text}`}>Calendar Connection Issue</p>
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
                        {!googleCalendarToken && !tokenLoading && (
                          <div className={`${getRoundedClass('rounded-lg')} p-2 mt-2`} style={{ backgroundColor: `${mintColor}22` }}>
                            <p className="font-semibold mb-1">No Google Calendar Access</p>
                            {tokenError ? (
                              <>
                                <p className="text-[10px] mb-2 text-red-400">{tokenError}</p>
                                {tokenError.includes('popup') && (
                                  <div className="text-[10px] space-y-1">
                                    <p className="font-semibold">To fix popup blocking:</p>
                                    <ol className="list-decimal list-inside ml-2 space-y-1">
                                      <li>Check your browser's popup blocker settings</li>
                                      <li>Allow popups for this site</li>
                                      <li>Refresh the page</li>
                                    </ol>
                                  </div>
                                )}
                                {tokenError.includes('NEXT_PUBLIC_GOOGLE_CLIENT_ID') && (
                                  <p className="text-[10px] mt-2 font-semibold text-yellow-400">
                                    ⚠️ Add NEXT_PUBLIC_GOOGLE_CLIENT_ID to your .env.local file and restart the dev server.
                                  </p>
                                )}
                              </>
                            ) : (
                              <p className="text-[10px]">The app needs permission to access your Google Calendar. A consent dialog should appear, or refresh the page.</p>
                            )}
                          </div>
                        )}
                        {tokenLoading && (
                          <div className={`${getRoundedClass('rounded-lg')} p-2 mt-2`} style={{ backgroundColor: `${mintColor}22` }}>
                            <p className="text-[10px]">⏳ Requesting Google Calendar access... Check for a popup window.</p>
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
                  <div className="space-y-4">
                    {/* Key/Legend */}
                    <div className={`${getRoundedClass('rounded-lg')} p-3 mb-4`} style={{ backgroundColor: `${mintColor}22` }}>
                      <p className={`text-xs font-black uppercase mb-2 ${style.text}`}>Key:</p>
                      <div className="flex flex-wrap gap-3">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#FF6B6B' }}></div>
                          <span className={`text-[10px] ${style.text}/80`}>Out of Office</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#9D4EFF' }}></div>
                          <span className={`text-[10px] ${style.text}/80`}>Strategy Team</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#FFC043' }}></div>
                          <span className={`text-[10px] ${style.text}/80`}>Holidays</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#00FF87' }}></div>
                          <span className={`text-[10px] ${style.text}/80`}>Office Events</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Day headers */}
                    <div className="grid grid-cols-7 gap-2 mb-4">
                      {getWeekDays().map((day, index) => {
                        const isToday = day.toDateString() === now.toDateString()
                        const dayName = day.toLocaleDateString('en-US', { weekday: 'short' })
                        const dayNumber = day.getDate()
                        return (
                          <div key={index} className="text-center">
                            <p className={`text-xs font-black uppercase ${style.text} mb-1`} style={{ color: isToday ? mintColor : style.text }}>
                              {isToday ? 'TODAY' : dayName}
                            </p>
                            <p className={`text-sm font-black ${style.text}`}>{dayNumber}</p>
                          </div>
                        )
                      })}
                    </div>

                    {/* Events as Gantt bars */}
                    <div className="space-y-2">
                      {filteredEvents.map((event) => {
                        const eventColor = getEventColor(event)
                        const span = getEventSpan(event)
                        const colSpan = span.endDay - span.startDay + 1
                        const startCol = span.startDay + 1
                        
                        return (
                          <div key={event.id} className="relative mb-2">
                            {/* Event bar spanning days - merged boxes */}
                            <div className="flex">
                              {getWeekDays().map((day, index) => {
                                const isInSpan = index >= span.startDay && index <= span.endDay
                                if (!isInSpan) {
                                  return <div key={index} className="flex-1 h-12"></div>
                                }
                                
                                const isStart = index === span.startDay
                                const isEnd = index === span.endDay
                                
                                return (
                                  <div
                                    key={index}
                                    className={`flex-1 h-12 ${getRoundedClass(isStart && isEnd ? 'rounded-lg' : isStart ? 'rounded-l-lg' : isEnd ? 'rounded-r-lg' : '')} flex items-center px-2`}
                                    style={{ 
                                      backgroundColor: `${eventColor}66`,
                                      borderLeft: isStart ? `3px solid ${eventColor}` : 'none',
                                    }}
                                  >
                                    {isStart && (
                                      <div className="flex-1 min-w-0">
                                        <p className={`text-xs font-black ${style.text} truncate`}>{event.summary}</p>
                                        <p className={`text-[10px] ${style.text}/70`}>{formatEventTime(event)}</p>
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
                        <p className={`text-sm ${style.text}/80 text-center py-4`}>No events this week</p>
                      )}
                    </div>
                  </div>
                ) : (
                  // Today view
                  <div className="space-y-4">
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
                            // Extract name (usually before " - " or " vacation" etc)
                            const summary = event.summary
                            const nameMatch = summary.match(/^([^-]+?)(?:\s*-\s*|\s+vacation|\s+parental|\s+leave)/i)
                            return nameMatch ? nameMatch[1].trim() : summary.split(' - ')[0].trim()
                          })
                          .filter(Boolean)
                      ))
                      
                      if (oooPeople.length > 0) {
                        return (
                          <div className="space-y-2">
                            <p className={`text-xs uppercase tracking-wider font-black ${style.text}/70 mb-2`}>Out of Office Today</p>
                            <div className={`${getRoundedClass('rounded-lg')} p-3`} style={{ backgroundColor: '#FF6B6B33' }}>
                              <div className="flex flex-wrap gap-2">
                                {oooPeople.map((name, idx) => (
                                  <span 
                                    key={idx}
                                    className={`text-xs font-black px-2 py-1 ${getRoundedClass('rounded')}`}
                                    style={{ 
                                      backgroundColor: '#FF6B6B66',
                                      color: '#FF6B6B'
                                    }}
                                  >
                                    {name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        )
                      }
                      return null
                    })()}
                    
                    {/* Other Events */}
                    <div className="space-y-2">
                      {filteredEvents.length > 0 ? (
                        filteredEvents.map((event) => {
                          const eventColor = getEventColor(event)
                          return (
                            <div key={event.id} className={`${getRoundedClass('rounded-lg')} p-3 flex items-center gap-2`} style={{ backgroundColor: `${eventColor}33` }}>
                              <Clock className="w-4 h-4" style={{ color: eventColor }} />
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-black ${style.text} truncate`}>{event.summary}</p>
                                <p className={`text-xs ${style.text}/60`}>{formatEventTime(event)}</p>
                              </div>
                            </div>
                          )
                        })
                      ) : (
                        <p className={`text-sm ${style.text}/80 text-center py-4`}>No events today</p>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            )
          })()}

          {/* Pipeline with This Week stats bar above it */}
          <div className={`${eventsExpanded ? 'md:col-span-1' : 'md:col-span-3'} flex flex-col ${eventsExpanded ? 'gap-4 h-full' : 'gap-6'}`}>
            {/* This Week Stats Bar */}
            {(() => {
              const style = mode === 'chaos' ? getSpecificCardStyle('friday-drop') : getCardStyle('work')
              const stats = [
                { value: '5', label: 'new business' },
                { value: '8', label: 'pitches shipped' },
                { value: '12', label: 'placeholder' },
              ]
              return (
                <Card 
                  className={`${style.bg} ${style.border} ${eventsExpanded ? 'p-6 flex-[0_0_auto]' : 'py-3 px-6 flex-[0_0_auto]'} ${getRoundedClass('rounded-[2.5rem]')} transition-all duration-300`} 
                  style={eventsExpanded ? { minHeight: '0' } : { height: '80px', maxHeight: '80px', minHeight: '80px' }}
                >
                  {eventsExpanded ? (
                    /* Vertical stats view when expanded - Bold and clean */
                    <div className="flex flex-col gap-2 h-full">
                      <h2 className={`text-2xl font-black uppercase leading-none ${style.text} mb-3`}>THIS WEEK</h2>
                      {stats.map((stat, index) => (
                        <div key={stat.label} className="flex items-center justify-between">
                          <div className={`text-base font-normal tracking-wide ${style.text}`}>
                            {stat.label}
                          </div>
                          <div 
                            className={`text-5xl font-black ${style.text} px-4 py-2 rounded-lg`}
                            style={{
                              backgroundColor: mode === 'chaos' ? 'rgba(0,0,0,0.3)' : mode === 'chill' ? 'rgba(74,24,24,0.25)' : 'rgba(0,0,0,0.35)',
                            }}
                          >
                            {stat.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Horizontal banner view when not expanded */
                    <div className="flex items-center justify-between gap-6 h-full">
                      <h2 className={`text-3xl font-black uppercase leading-none ${style.text} whitespace-nowrap`}>THIS WEEK</h2>
                      <div className="flex gap-3 items-center">
                        {stats.map((stat, index) => (
                          <div 
                            key={stat.label} 
                            className={`flex flex-col items-center justify-center px-5 py-4 ${getRoundedClass('rounded-2xl')} transition-all duration-300 shadow-sm`}
                            style={{
                              backgroundColor: mode === 'chaos' ? 'rgba(0,0,0,0.15)' : mode === 'chill' ? 'rgba(74,24,24,0.12)' : 'rgba(0,0,0,0.2)',
                              animation: `fadeInUp 0.6s ease-out ${index * 0.1}s both`
                            }}
                          >
                            <span className={`text-5xl font-black ${style.text} leading-none mb-1 transition-all duration-300`}>
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
              const borderColor = mode === 'chaos' ? '#C4F500' : mode === 'chill' ? '#FFC043' : mode === 'code' ? '#FFFFFF' : '#00FF87'
              
              const inProgressProjects = pipelineData.filter(p => p.status === 'In Progress')
              const completedProjects = pipelineData.filter(p => p.status === completedFilter)
              
              // Calculate counts for all statuses
              const statusCounts = {
                'In Progress': pipelineData.filter(p => p.status === 'In Progress').length,
                'Pending Decision': pipelineData.filter(p => p.status === 'Pending Decision').length,
                'Long Lead': pipelineData.filter(p => p.status === 'Long Lead').length,
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
                      className="shrink-0 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 h-7 w-7 mt-0.5"
                      onClick={() => handleProjectClick(project)}
                    >
                      <Plus className="size-4 text-white" />
                    </Button>
                    {/* Content */}
                    <div className="flex-1 min-w-0 text-sm">
                      {date && (
                        <div className="text-white/60 mb-1 text-xs">{date}</div>
                      )}
                      <div className="font-bold text-white truncate">{project.name}</div>
                      <div className="text-white/60 truncate text-xs">{displayText}</div>
                    </div>
                  </div>
                )
              }
              
              return (
                <>
                  <Card 
                    className={`${eventsExpanded ? 'p-6 flex-[2]' : 'p-6'} ${getRoundedClass('rounded-[2.5rem]')} transition-all duration-300 overflow-hidden`}
                    style={{
                      backgroundColor: '#1a1a1a',
                      borderColor: borderColor,
                      borderWidth: '2px',
                    }}
                  >
                    {!eventsExpanded && (
                      <h2 className="text-3xl mb-3 font-black uppercase text-white transition-all duration-300">PIPELINE</h2>
                    )}
                    
                    {eventsExpanded ? (
                      /* Stats view when events expanded - Clean vertical layout */
                      <div className="flex flex-col gap-2 h-full">
                        <h2 className="text-2xl mb-3 font-black uppercase text-white">PIPELINE</h2>
                        <div className="flex items-center justify-between">
                          <div className="text-base text-white font-normal tracking-wide">In Progress</div>
                          <div 
                            className="text-5xl font-black text-white px-4 py-2 rounded-lg"
                            style={{
                              backgroundColor: 'rgba(0,0,0,0.4)',
                            }}
                          >
                            {pipelineLoading ? '0' : statusCounts['In Progress']}
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="text-base text-white font-normal tracking-wide">Pending</div>
                          <div 
                            className="text-5xl font-black text-white px-4 py-2 rounded-lg"
                            style={{
                              backgroundColor: 'rgba(0,0,0,0.4)',
                            }}
                          >
                            {pipelineLoading ? '0' : statusCounts['Pending Decision']}
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="text-base text-white font-normal tracking-wide">Long Lead</div>
                          <div 
                            className="text-5xl font-black text-white px-4 py-2 rounded-lg"
                            style={{
                              backgroundColor: 'rgba(0,0,0,0.4)',
                            }}
                          >
                            {pipelineLoading ? '0' : statusCounts['Long Lead']}
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="text-base text-white font-normal tracking-wide">Won</div>
                          <div 
                            className="text-5xl font-black text-white px-4 py-2 rounded-lg"
                            style={{
                              backgroundColor: 'rgba(0,0,0,0.4)',
                            }}
                          >
                            {pipelineLoading ? '0' : statusCounts['Won']}
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="text-base text-white font-normal tracking-wide">Lost</div>
                          <div 
                            className="text-5xl font-black text-white px-4 py-2 rounded-lg"
                            style={{
                              backgroundColor: 'rgba(0,0,0,0.4)',
                            }}
                          >
                            {pipelineLoading ? '0' : statusCounts['Lost']}
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Full view when events not expanded */
                      <div className="grid grid-cols-1 lg:grid-cols-2 divide-x" style={{ borderColor: `${borderColor}40` }}>
                      {/* Left Half - IN PROGRESS */}
                      <div className="flex flex-col pr-4">
                        <div className="flex items-center gap-3 mb-4">
                          <h3 className="text-lg font-semibold text-white">IN PROGRESS</h3>
                          <Badge 
                            variant="secondary" 
                            className="text-xs"
                            style={{ 
                              backgroundColor: `${borderColor}20`,
                              color: borderColor,
                              borderColor: borderColor
                            }}
                          >
                            {pipelineLoading ? '0' : inProgressProjects.length} {inProgressProjects.length === 1 ? 'project' : 'projects'}
                          </Badge>
                        </div>
                        
                        {/* Scrollable list - Fixed height to align bottoms */}
                        <div className="overflow-y-auto" style={{ height: '400px' }}>
                          <div className="space-y-1">
                            {!pipelineLoading && inProgressProjects.length > 0 ? (
                              inProgressProjects.map((project, index) => 
                                renderProjectItem(project, index, inProgressProjects.length)
                              )
                            ) : (
                              <div className="text-white/60 text-sm py-4">
                                No projects in progress
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Half - COMPLETED */}
                      <div className="flex flex-col pl-4">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-white">COMPLETED</h3>
                          
                          {/* Tabs - Right aligned and in line with COMPLETED */}
                          <div className="flex flex-wrap gap-2">
                            {(['Pending Decision', 'Long Lead', 'Won', 'Lost'] as const).map((status) => (
                              <Button
                                key={status}
                                size="sm"
                                onClick={() => setCompletedFilter(status)}
                                className="text-xs h-7"
                                style={{
                                  backgroundColor: completedFilter === status ? borderColor : 'transparent',
                                  color: completedFilter === status ? '#000' : borderColor,
                                  borderColor: borderColor,
                                  borderWidth: '1px',
                                }}
                              >
                                {status === 'Pending Decision' ? 'Pending' : status}
                              </Button>
                            ))}
                          </div>
                        </div>
                        
                        {/* Scrollable list - Fixed height to align bottoms, show one less item */}
                        <div className="overflow-y-auto" style={{ height: '400px' }}>
                          <div className="space-y-1">
                            {!pipelineLoading && completedProjects.length > 0 ? (
                              completedProjects.slice(0, Math.max(0, completedProjects.length - 1)).map((project, index) => 
                                renderProjectItem(project, index, completedProjects.length - 1)
                              )
                            ) : (
                              <div className="text-white/60 text-sm py-4">
                                No projects with status: {completedFilter}
                              </div>
                            )}
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
                        backgroundColor: '#1a1a1a',
                        borderColor: borderColor,
                        borderWidth: '2px',
                        opacity: 1,
                      }}
                    >
                      <DialogHeader>
                        <DialogTitle className="text-white">
                          {selectedPipelineProject?.name}
                        </DialogTitle>
                        <DialogDescription className="text-white/60">
                          {selectedPipelineProject?.type || selectedPipelineProject?.description || 'No description'}
                        </DialogDescription>
                      </DialogHeader>
                      
                      {selectedPipelineProject && (
                        <div className="space-y-4 mt-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm font-semibold text-white mb-1">Status</p>
                              <p className="text-white/80">{selectedPipelineProject.status}</p>
                            </div>
                            {selectedPipelineProject.due_date && (
                              <div>
                                <p className="text-sm font-semibold text-white mb-1">Due Date</p>
                                <p className="text-white/80">{formatDate(selectedPipelineProject.due_date)}</p>
                              </div>
                            )}
                          </div>
                          
                          {selectedPipelineProject.lead && (
                            <div>
                              <p className="text-sm font-semibold text-white mb-1">Lead</p>
                              <p className="text-white/80">{selectedPipelineProject.lead}</p>
                            </div>
                          )}
                          
                          {selectedPipelineProject.team && (
                            <div>
                              <p className="text-sm font-semibold text-white mb-1">Team</p>
                              <p className="text-white/80">{selectedPipelineProject.team}</p>
                            </div>
                          )}
                          
                          {selectedPipelineProject.description && (
                            <div>
                              <p className="text-sm font-semibold text-white mb-1">Description</p>
                              <p className="text-white/80 whitespace-pre-wrap">{selectedPipelineProject.description}</p>
                            </div>
                          )}
                          
                          {selectedPipelineProject.notes && (
                            <div>
                              <p className="text-sm font-semibold text-white mb-1">Notes</p>
                              <p className="text-white/80 whitespace-pre-wrap">{selectedPipelineProject.notes}</p>
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
                                href={selectedPipelineProject.url} 
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
              
              return (
                <div className="flex-1 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className={`text-3xl font-black uppercase leading-tight ${textStyle}`}>RECENT WORK</h2>
                    <div className="flex items-center gap-3">
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
                          {sample.thumbnail_url ? (
                            <img 
                              src={
                                // Use proxy immediately for Airtable URLs (they're expired)
                                sample.thumbnail_url.includes('airtable.com') || sample.thumbnail_url.includes('airtableusercontent.com')
                                  ? `/api/work-samples/thumbnail?url=${encodeURIComponent(sample.thumbnail_url)}`
                                  // For Supabase URLs, try direct first, fallback to proxy on error
                                  : sample.thumbnail_url
                              }
                              alt={sample.project_name}
                              className={`w-full aspect-video object-cover ${getRoundedClass('rounded-xl')} mb-3 border ${mode === 'chaos' ? 'border-gray-800' : mode === 'chill' ? 'border-gray-300' : 'border-gray-700'}`}
                              onError={(e) => {
                                // Try proxy if direct URL fails (for Supabase URLs)
                                const target = e.target as HTMLImageElement
                                const originalSrc = target.src
                                if (originalSrc.includes('supabase') && !originalSrc.includes('/api/work-samples/thumbnail')) {
                                  target.src = `/api/work-samples/thumbnail?url=${encodeURIComponent(originalSrc)}`
                                } else {
                                  // Hide broken image and show placeholder
                                  target.style.display = 'none'
                                  const placeholder = target.nextElementSibling as HTMLElement
                                  if (placeholder) {
                                    placeholder.style.display = 'flex'
                                  }
                                }
                              }}
                            />
                          ) : null}
                          <div className={`w-full aspect-video ${getRoundedClass('rounded-xl')} mb-3 bg-gray-200 flex items-center justify-center border ${mode === 'chaos' ? 'border-gray-800' : mode === 'chill' ? 'border-gray-300' : 'border-gray-700'} ${sample.thumbnail_url ? 'hidden' : ''}`}>
                            <span className="text-gray-400 text-xs">No Image</span>
                          </div>
                          <div className="flex flex-col gap-2">
                            {/* Date */}
                            <p className={`text-xs ${textStyle}/70`}>
                              {sample.date ? new Date(sample.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                            </p>
                            
                            {/* Title with external link */}
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


        <p className={`text-xs uppercase tracking-widest font-black mb-6 flex items-center gap-2 ${mode === 'chaos' ? 'text-[#666666]' : mode === 'chill' ? 'text-[#8B4444]' : mode === 'code' ? 'text-[#808080] font-mono' : 'text-[#808080]'}`}>
          {mode === 'code' ? (
            <>
              <span className="text-[#FFFFFF]">════════════════════════════════════════</span>
              <span className="text-[#808080]">MORE MODULES</span>
              <span className="text-[#FFFFFF]">════════════════════════════════════════</span>
            </>
          ) : (
            <>
              <span className={`w-8 h-px ${mode === 'chaos' ? 'bg-[#333333]' : mode === 'chill' ? 'bg-[#8B4444]/30' : 'bg-[#333333]'}`}></span>
          More Modules
            </>
          )}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Ask The Hive */}
          {(() => {
            const style = mode === 'chaos' ? getSpecificCardStyle('ask-hive') : getCardStyle('community')
            return (
              <Card className={`${style.bg} ${style.border} p-6 ${getRoundedClass('rounded-[2.5rem]')}`}
                    style={style.glow ? { boxShadow: `0 0 40px ${style.glow}` } : {}}
              >
                <div className="flex items-center gap-2 text-sm mb-3" style={{ color: style.accent }}>
              <MessageCircle className="w-4 h-4" />
                  <span className="uppercase tracking-wider font-black text-xs">Community</span>
            </div>
                <h2 className={`text-3xl font-black mb-6 uppercase ${style.text}`}>ASK THE<br/>HIVE</h2>
            <div className="space-y-3 mb-4">
                  {[
                    { question: 'Best prototyping tool?', answers: '5 answers' },
                    { question: 'Handle difficult client?', answers: '12 answers' },
                  ].map((item) => (
                    <div key={item.question} className={`${mode === 'chaos' ? 'bg-black/40 backdrop-blur-sm' : mode === 'chill' ? 'bg-[#F5E6D3]/50' : 'bg-black/40'} rounded-xl p-4 border-2`} style={{ borderColor: `${style.accent}40` }}>
                      <p className={`text-sm font-black mb-1 ${style.text}`}>{item.question}</p>
                      <p className={`text-xs font-medium ${style.text}/70`}>{item.answers}</p>
              </div>
                  ))}
              </div>
                <Button className={`w-full ${mode === 'chaos' ? 'bg-black text-[#9D4EFF] hover:bg-[#0F0F0F]' : mode === 'chill' ? 'bg-[#4A1818] text-[#8B4444] hover:bg-[#3A1414]' : 'bg-white text-black hover:bg-[#e5e5e5]'} font-black rounded-full h-10 text-sm uppercase`}>
              Ask Question
            </Button>
          </Card>
            )
          })()}

          {/* Team Pulse */}
          {(() => {
            const style = mode === 'chaos' ? getSpecificCardStyle('team-pulse') : getCardStyle('team')
            const barColor = mode === 'chaos' ? '#C4F500' : mode === 'chill' ? '#FFC043' : '#ffffff'
            const barColor2 = mode === 'chaos' ? '#FF6B00' : mode === 'chill' ? '#FF6B35' : '#cccccc'
            return (
              <Card className={`${style.bg} ${style.border} p-6 ${getRoundedClass('rounded-[2.5rem]')}`}
                    style={style.glow ? { boxShadow: `0 0 40px ${style.glow}` } : {}}
              >
                <Badge className={`${mode === 'chaos' ? 'bg-[#00FF87] text-black' : mode === 'chill' ? 'bg-[#C8D961] text-[#4A1818]' : 'bg-white text-black'} border-0 font-black mb-4 text-xs`}>+85%</Badge>
                <h2 className={`text-3xl font-black mb-6 uppercase ${style.text}`}>Team Pulse</h2>
            <div className="space-y-4 mb-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                      <p className={`text-sm font-black ${style.text}`}>Happiness</p>
                      <p className={`text-2xl font-black ${style.text}`}>85</p>
                </div>
                    <div className={`w-full rounded-full h-2 ${mode === 'chaos' ? 'bg-black/40' : mode === 'chill' ? 'bg-[#F5E6D3]/50' : 'bg-black/40'}`}>
                      <div className="h-2 rounded-full" style={{ width: '85%', backgroundColor: barColor }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                      <p className={`text-sm font-black ${style.text}`}>Energy</p>
                      <p className={`text-2xl font-black ${style.text}`}>72</p>
                </div>
                    <div className={`w-full rounded-full h-2 ${mode === 'chaos' ? 'bg-black/40' : mode === 'chill' ? 'bg-[#F5E6D3]/50' : 'bg-black/40'}`}>
                      <div className="h-2 rounded-full" style={{ width: '72%', backgroundColor: barColor2 }} />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                  <div className={`${mode === 'chaos' ? 'bg-black/40' : mode === 'chill' ? 'bg-[#F5E6D3]/50' : 'bg-black/40'} rounded-xl p-3 border-2`} style={{ borderColor: `${style.accent}40` }}>
                    <p className={`text-xs font-black uppercase tracking-wider mb-1 ${style.text}`}>Excitements</p>
                    <ul className={`text-xs space-y-1 ${style.text}/80`}>
                  <li>• New project kick-off</li>
                  <li>• Team offsite soon</li>
                </ul>
              </div>
                  <div className={`${mode === 'chaos' ? 'bg-black/40' : mode === 'chill' ? 'bg-[#F5E6D3]/50' : 'bg-black/40'} rounded-xl p-3 border-2`} style={{ borderColor: `${style.accent}40` }}>
                    <p className={`text-xs font-black uppercase tracking-wider mb-1 ${style.text}`}>Frustrations</p>
                    <ul className={`text-xs space-y-1 ${style.text}/80`}>
                  <li>• Too many meetings</li>
                  <li>• Unclear priorities</li>
                </ul>
              </div>
            </div>
          </Card>
            )
          })()}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* Loom Standup */}
          {(() => {
            const style = mode === 'chaos' ? getSpecificCardStyle('loom-standup') : getCardStyle('team')
            const standupColors = mode === 'chaos'
              ? ['#00D4FF', '#9D4EFF', '#FF00FF']
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
              <Card className={`${style.bg} ${style.border} p-6 ${getRoundedClass('rounded-[2.5rem]')}`}
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

          {/* Inspiration War */}
          {(() => {
            const style = mode === 'chaos' ? getSpecificCardStyle('inspiration-war') : getCardStyle('hero')
            return (
              <Card className={`${style.bg} ${style.border} p-8 ${getRoundedClass('rounded-[2.5rem]')}`}
                    style={style.glow ? { boxShadow: `0 0 40px ${style.glow}` } : {}}
              >
            <div className="flex items-center justify-between mb-6">
              <div>
                    <div className="flex items-center gap-2 text-sm mb-2" style={{ color: style.accent }}>
                  <Lightbulb className="w-4 h-4" />
                      <span className="uppercase tracking-wider font-black text-xs">Today's Theme</span>
                </div>
                    <h2 className={`text-4xl font-black uppercase ${style.text}`}>INSPIRATION<br/>WAR</h2>
              </div>
                  <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: mode === 'chaos' ? '#1A1A1A' : mode === 'chill' ? '#4A1818' : '#000000' }}>
                    <Sparkles className="w-8 h-8" style={{ color: style.accent }} />
              </div>
            </div>
                <div className={`${mode === 'chaos' ? 'bg-black/10 backdrop-blur-sm' : mode === 'chill' ? 'bg-[#F5E6D3]/30' : 'bg-black/10'} rounded-2xl p-4 border-2 mb-6`} style={{ borderColor: `${style.accent}20` }}>
                  <p className={`font-black text-lg text-center ${style.text}`}>Retro Futurism</p>
            </div>
            <div className="grid grid-cols-4 gap-3 mb-6">
              {[16, 15, 9, 9].map((votes, i) => (
                    <div key={i} className={`${mode === 'chaos' ? 'bg-black/20 backdrop-blur-sm' : mode === 'chill' ? 'bg-[#F5E6D3]/50' : 'bg-black/20'} rounded-2xl p-4 border-2 flex flex-col items-center justify-center hover:opacity-80 transition-all cursor-pointer group`} style={{ borderColor: `${style.accent}30` }}>
                  <div className="text-3xl mb-1 group-hover:scale-110 transition-transform">🎨</div>
                      <p className={`text-xs font-black ${style.text}`}>~{votes}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between text-sm">
                  <p className={`font-black ${style.text}`}>🎨 24 entries</p>
                  <p className={`font-black ${style.text}`}>8h to vote</p>
            </div>
          </Card>
            )
          })()}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* Search */}
          {(() => {
            const style = mode === 'chaos' ? getSpecificCardStyle('search') : getCardStyle('hero')
            return (
              <Card className={`${style.bg} ${style.border} p-6 ${getRoundedClass('rounded-[2.5rem]')}`}
                    style={style.glow ? { boxShadow: `0 0 40px ${style.glow}` } : {}}
              >
                <div className="flex items-center gap-2 text-sm mb-3" style={{ color: style.accent }}>
              <Search className="w-4 h-4" />
                  <span className="uppercase tracking-wider font-black text-xs">Find Anything</span>
            </div>
                <h2 className={`text-4xl font-black mb-6 uppercase ${style.text}`}>SEARCH</h2>
            <div className="relative">
              <Input 
                placeholder="Resources, people, projects..."
                    className={`${mode === 'chaos' ? 'bg-black/40 border-zinc-700' : mode === 'chill' ? 'bg-[#F5E6D3]/50 border-[#8B4444]/30' : 'bg-black/40 border-zinc-700'} ${style.text} placeholder:${style.text}/50 rounded-xl h-14 pr-14 font-medium`}
              />
                  <Button className="absolute right-2 top-2 rounded-lg h-10 w-10 p-0" style={{ backgroundColor: style.accent, color: mode === 'chill' ? '#4A1818' : '#000000' }}>
                <Search className="w-5 h-5" />
              </Button>
            </div>
          </Card>
            )
          })()}
        </div>

        <footer className={`border-t pt-8 mt-12 ${getBorderClass()}`}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div>
              <h3 className={`text-xl font-black mb-2 ${getTextClass()}`}>Team Dashboard</h3>
              <p className={`text-sm ${mode === 'chaos' ? 'text-[#666666]' : mode === 'chill' ? 'text-[#8B4444]' : 'text-[#808080]'}`}>Built with love and way too much coffee</p>
            </div>
            <div>
              <p className={`text-xs uppercase tracking-wider font-black mb-2 ${mode === 'chaos' ? 'text-[#666666]' : mode === 'chill' ? 'text-[#8B4444]' : 'text-[#808080]'}`}>Totally Real Stats</p>
              <p className={`text-sm ${mode === 'chaos' ? 'text-[#808080]' : mode === 'chill' ? 'text-[#8B4444]/80' : 'text-[#999999]'}`}>347 cups of coffee consumed</p>
              <p className={`text-sm ${mode === 'chaos' ? 'text-[#808080]' : mode === 'chill' ? 'text-[#8B4444]/80' : 'text-[#999999]'}`}>48 good vibes generated</p>
              <p className={`text-sm ${mode === 'chaos' ? 'text-[#808080]' : mode === 'chill' ? 'text-[#8B4444]/80' : 'text-[#999999]'}`}>100% team awesomeness</p>
            </div>
            <div>
              <p className={`text-xs uppercase tracking-wider font-black mb-2 ${mode === 'chaos' ? 'text-[#666666]' : mode === 'chill' ? 'text-[#8B4444]' : 'text-[#808080]'}`}>Fun Fact</p>
              <p className={`text-sm ${mode === 'chaos' ? 'text-[#808080]' : mode === 'chill' ? 'text-[#8B4444]/80' : 'text-[#999999]'}`}>We put the 'fun' in 'functional' and also in 'funnel', but we don't talk about that</p>
            </div>
            <div>
              <p className={`text-xs uppercase tracking-wider font-black mb-2 ${mode === 'chaos' ? 'text-[#666666]' : mode === 'chill' ? 'text-[#8B4444]' : 'text-[#808080]'}`}>Good Morning</p>
              <p className={`text-sm ${mode === 'chaos' ? 'text-[#808080]' : mode === 'chill' ? 'text-[#8B4444]/80' : 'text-[#999999]'}`}>Time to make today awesome! After coffee, obviously</p>
            </div>
          </div>
          <div className={`flex items-center justify-between text-xs pt-6 border-t ${getBorderClass()}`} style={{ color: mode === 'chaos' ? '#666666' : mode === 'chill' ? '#8B4444' : '#808080' }}>
            <p>© 2025 Team Dashboard. Made with questionable decisions and great intentions.</p>
            <div className="flex items-center gap-4">
              <a href="#" className={`transition-colors ${mode === 'chaos' ? 'hover:text-[#808080]' : mode === 'chill' ? 'hover:text-[#8B4444]/80' : 'hover:text-[#999999]'}`}>Privacy lol we're a team!</a>
              <a href="#" className={`transition-colors ${mode === 'chaos' ? 'hover:text-[#808080]' : mode === 'chill' ? 'hover:text-[#8B4444]/80' : 'hover:text-[#999999]'}`}>Terms just be cool</a>
              <a href="#" className={`transition-colors ${mode === 'chaos' ? 'hover:text-[#808080]' : mode === 'chill' ? 'hover:text-[#8B4444]/80' : 'hover:text-[#999999]'}`}>Contact we're right here</a>
            </div>
          </div>
          <p className={`text-center text-[10px] mt-4 ${mode === 'chaos' ? 'text-[#666666]' : mode === 'chill' ? 'text-[#8B4444]/70' : 'text-[#666666]'}`}>v1.2.3-beta-test.beta</p>
        </footer>
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

    </div>
  )
}
