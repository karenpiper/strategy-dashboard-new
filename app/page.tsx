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
import { TeamPulseCard } from '@/components/team-pulse-card'
import { Footer } from '@/components/footer'

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
  const [userFirstName, setUserFirstName] = useState<string>('')
  const [temperature, setTemperature] = useState<string | null>(null)
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
  const [weeklyPlaylist, setWeeklyPlaylist] = useState<{
    id: string
    date: string
    title: string | null
    curator: string
    curator_photo_url: string | null
    cover_url: string | null
    description: string | null
    spotify_url: string
  } | null>(null)
  const [playlistLoading, setPlaylistLoading] = useState(true)
  const [isPlaylistDialogOpen, setIsPlaylistDialogOpen] = useState(false)
  
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
            }
          }
        }
      } catch (err) {
        console.error('Error fetching weather:', err)
        setTemperature(null)
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

  // Fetch weekly playlist
  useEffect(() => {
    async function fetchWeeklyPlaylist() {
      if (!user) return
      
      try {
        setPlaylistLoading(true)
        // Try with refresh to get Spotify metadata if missing
        const response = await fetch('/api/playlists?refresh=true')
        if (response.ok) {
          const playlists = await response.json()
          if (playlists && playlists.length > 0) {
            // Get the most recent playlist
            setWeeklyPlaylist(playlists[0])
          }
        }
      } catch (error) {
        console.error('Error fetching playlist:', error)
      } finally {
        setPlaylistLoading(false)
      }
    }
    
    fetchWeeklyPlaylist()
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
            
            if (result.count === 0 && result.successfulCalendars === 0) {
              // Only show error if no events were loaded at all (all calendars failed)
              // Create a more user-friendly error message
              const failedCount = failedDetails.length
              const hasCodeAndTheoryCalendars = failedDetails.some((f: any) => 
                f.id.includes('codeandtheory.com_')
              )
              
              // Create a user-friendly summary
              let errorSummary = ''
              if (hasCodeAndTheoryCalendars && failedCount <= 3) {
                errorSummary = `${failedCount} Code and Theory calendar${failedCount > 1 ? 's' : ''}`
              } else {
                errorSummary = `${failedCount} calendar${failedCount > 1 ? 's' : ''}`
              }
              
              setCalendarError(`Some calendars are not accessible. ${errorSummary}: Calendar not found or not accessible`)
            } else {
              // Some calendars worked, so clear any previous error
              // We'll just log a warning in the console instead of showing an error
              setCalendarError(null)
              console.info(`Successfully loaded events from ${result.successfulCalendars} calendar(s). ${result.failedCalendars} calendar(s) could not be accessed.`)
            }
          } else {
            // No failed calendars, clear any previous error
            setCalendarError(null)
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
        'snaps': { bg: 'bg-[#1E293B]', border: 'border-2', glow: '', text: 'text-white', accent: '#10B981' }, // Slate Grey bg with Emerald accent and border
        
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
    <div className={`flex flex-col ${getBgClass()} ${getTextClass()} ${mode === 'code' ? 'font-mono' : 'font-[family-name:var(--font-raleway)]'}`}>
      <header className={`border-b ${getBorderClass()} px-6 py-4`}>
        <div className="max-w-[1200px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className={`w-10 h-10 ${getLogoBg()} ${getLogoText()} ${getRoundedClass('rounded-xl')} flex items-center justify-center font-black text-lg ${mode === 'code' ? 'font-mono' : ''}`}>
              {mode === 'code' ? 'C:\\>' : 'D'}
            </div>
            <nav className="flex items-center gap-6">
              <a href="#" className={getNavLinkClass(true)}>HOME</a>
              <Link href="/snaps" className={getNavLinkClass()}>SNAPS</Link>
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

      <main className="max-w-[1200px] mx-auto px-6 py-4 flex-1 pb-0">
        {/* Hero Section - Full Width */}
        <section className="mb-12">
          {(() => {
            const style = mode === 'chaos' ? getSpecificCardStyle('hero-large') : getCardStyle('hero')
            return (
              <Card className={`${style.bg} ${style.border} p-0 ${mode === 'chaos' ? getRoundedClass('rounded-[2.5rem]') : getRoundedClass('rounded-[2.5rem]')} relative overflow-hidden group min-h-[300px] flex flex-col justify-between`}
                    style={style.glow ? { boxShadow: `0 0 40px ${style.glow}` } : {}}
              >
                {/* Black masked section on the right with transform/rotation - contains horoscope image */}
                {mode === 'chaos' && (
                  <div className={`absolute top-0 right-0 w-1/2 h-full ${getBgClass()} ${getRoundedClass('rounded-[2.5rem]')} transform translate-x-[10%] -rotate-12 overflow-hidden`}>
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
                  <div className={`absolute top-0 right-0 w-[55%] h-full ${getBgClass()} overflow-hidden`} 
                       style={{ clipPath: 'polygon(8% 0, 100% 0, 100% 100%, 0% 100%)' }} 
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
                    <p className={`text-[clamp(1.25rem,3vw+0.5rem,2rem)] font-bold max-w-2xl leading-tight ${mode === 'code' ? 'font-mono text-[#FFFFFF]' : style.text}`}>
                      {mode === 'code' 
                        ? `It's ${todayDate || 'Loading...'}${temperature ? ` and ${temperature}` : ''}`
                        : `It's ${todayDate || 'Loading...'}${temperature ? ` and ${temperature}` : ''}`
                      }
                    </p>
                  </div>
                  <div className="relative z-10 flex items-center gap-3 md:gap-4 flex-wrap mt-8">
                    {(() => {
                      // Determine if background is light (for button contrast)
                      const isLightBg = style.text === 'text-black'
                      
                      return (
                        <>
                          {['Give Snap', 'Need Help', 'Add Win'].map((label) => {
                            // Determine button colors based on mode - always use dark background with white text for good contrast
                      let buttonStyle: React.CSSProperties = {}
                      let buttonClasses = ''
                      
                      if (mode === 'chaos') {
                        // Use dark background with white text for good contrast
                        buttonStyle = {
                          backgroundColor: isLightBg ? '#000000' : '#1a1a1a',
                          color: '#FFFFFF'
                        }
                        buttonClasses = `${isLightBg ? 'hover:bg-[#0F0F0F]' : 'hover:bg-[#2a2a2a]'} hover:scale-105`
                      } else if (mode === 'chill') {
                        buttonStyle = {
                          backgroundColor: '#4A1818',
                          color: '#FFFFFF'
                        }
                        buttonClasses = 'hover:bg-[#3A1414]'
                      } else if (mode === 'code') {
                        buttonStyle = {
                          backgroundColor: '#000000',
                          color: '#FFFFFF'
                        }
                        buttonClasses = 'hover:bg-[#1a1a1a] border border-[#FFFFFF]'
                      } else {
                        buttonStyle = {
                          backgroundColor: '#000000',
                          color: '#FFFFFF'
                        }
                        buttonClasses = 'hover:bg-[#1a1a1a]'
                      }
                      
                      return (
                        <Button 
                          key={label} 
                          className={`${buttonClasses} font-semibold ${getRoundedClass('rounded-full')} py-3 md:py-4 px-6 md:px-8 text-base md:text-lg tracking-normal transition-all hover:shadow-2xl ${mode === 'code' ? 'font-mono' : ''}`}
                          style={buttonStyle}
                        >
                          {mode === 'code' ? `[${label.toUpperCase().replace(' ', ' ')}]` : label} {mode !== 'code' && <ArrowRight className="w-4 h-4 ml-2" />}
                        </Button>
                      )
                    })}
                          <Button 
                      onClick={() => setIsPlaylistDialogOpen(true)}
                      className={`${mode === 'chaos' ? (isLightBg ? 'hover:bg-[#0F0F0F]' : 'hover:bg-[#2a2a2a]') + ' hover:scale-105' : mode === 'chill' ? 'hover:bg-[#3A1414]' : mode === 'code' ? 'hover:bg-[#1a1a1a] border border-[#FFFFFF]' : 'hover:bg-[#1a1a1a]'} font-semibold ${getRoundedClass('rounded-full')} py-3 md:py-4 px-6 md:px-8 text-base md:text-lg tracking-normal transition-all hover:shadow-2xl ${mode === 'code' ? 'font-mono' : ''}`}
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
                      {mode === 'code' ? '[PLAYLIST]' : 'Playlist'} {mode !== 'code' && <Music className="w-4 h-4 ml-2" />}
                          </Button>
                        </>
                      )
                    })()}
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
              ? ['#00A3E0', '#1B4D7C', '#7DD3F0', '#00A3E0', '#1B4D7C', '#7DD3F0', '#00A3E0'] // Team palette: Ocean, Navy, Sky (BLUE SYSTEM)
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
                              ? 'ring-2 ring-[#0EA5E9] ring-offset-2 ring-offset-black' 
                              : mode === 'chill'
                              ? 'ring-2 ring-[#FFC043] ring-offset-2 ring-offset-[#F5E6D3]'
                              : 'ring-2 ring-[#FFFFFF] ring-offset-2 ring-offset-black'
                            : ''
                        }`}
                        style={{
                          backgroundColor: isUserTz ? timeZoneColors[idx] : '#333333',
                          boxShadow: isUserTz 
                            ? mode === 'chaos' 
                              ? '0 0 10px rgba(14, 165, 233, 0.5)' 
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
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
          <div className="flex flex-col h-full space-y-6">
            {/* Beast Babe */}
            {(() => {
              const style = mode === 'chaos' ? getSpecificCardStyle('beast-babe') : getCardStyle('recognition')
              return (
                <Card className={`${style.bg} ${style.border} p-6 ${getRoundedClass('rounded-[2.5rem]')} flex-shrink-0`}
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
                <Card className={`${style.bg} ${style.border} p-6 ${getRoundedClass('rounded-[2.5rem]')} flex-1 flex flex-col min-h-0`}
                      style={style.glow ? { boxShadow: `0 0 40px ${style.glow}` } : {}}
                >
                  <div className="flex items-center gap-2 text-sm mb-2" style={{ color: style.accent }}>
                <Trophy className="w-4 h-4" />
                    <span className="uppercase tracking-wider font-black text-xs">Celebrate</span>
              </div>
                  <h2 className={`text-4xl font-black mb-4 uppercase ${style.text}`}>WINS<br/>WALL</h2>
              <div className="space-y-2 mb-4 flex-1">
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
                  <Button className={`w-full mt-auto ${mode === 'chaos' ? 'bg-black text-[#84CC16] hover:bg-[#0F0F0F]' : mode === 'chill' ? 'bg-[#4A1818] text-[#C8D961] hover:bg-[#3A1414]' : 'bg-white text-black hover:bg-[#e5e5e5]'} font-black rounded-full h-12 uppercase`}>
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
                <div className="space-y-2 mb-6 mt-2">
                  {snaps.length === 0 ? (
                    <div className={`${mode === 'chaos' ? 'bg-black/40 backdrop-blur-sm' : mode === 'chill' ? 'bg-[#F5E6D3]/30' : 'bg-black/40'} rounded-xl p-5 border-2`} style={{ borderColor: `${style.accent}66` }}>
                      <p className={`text-sm ${style.text}/80 text-center`}>No snaps yet. Be the first to recognize someone!</p>
                    </div>
                  ) : (
                    snaps.map((snap, idx) => {
                      const senderName = snap.submitted_by_profile?.full_name || snap.submitted_by_profile?.email || null
                      const recipientName = snap.mentioned_user_profile?.full_name || snap.mentioned_user_profile?.email || snap.mentioned || 'Team'
                      
                      // Determine which avatar to show
                      let profilePicture: string | null = null
                      let avatarName: string | null = null
                      if (snapViewType === 'received') {
                        profilePicture = snap.submitted_by_profile?.avatar_url || null
                        avatarName = senderName
                      } else {
                        profilePicture = snap.mentioned_user_profile?.avatar_url || null
                        avatarName = recipientName
                      }
                      
                      return (
                        <div key={snap.id} className={`${mode === 'chaos' ? 'bg-black/40 backdrop-blur-sm' : mode === 'chill' ? 'bg-[#F5E6D3]/30' : 'bg-black/40'} rounded-xl p-1.5 border-2 transition-all hover:opacity-80 relative`} style={{ borderColor: `${style.accent}66` }}>
                          <div className="flex items-start gap-2">
                            <div className="flex-shrink-0" style={{ padding: '2px', width: '50px', height: '50px' }}>
                              {profilePicture ? (
                                <img 
                                  src={profilePicture} 
                                  alt={avatarName || 'User'}
                                  className={`rounded-lg w-full h-full object-cover`}
                                />
                              ) : (
                                <div className="w-full h-full rounded-full flex items-center justify-center" style={{ 
                                  backgroundColor: style.accent
                                }}>
                                  <User className={`w-5 h-5 ${mode === 'chaos' || mode === 'code' ? 'text-black' : mode === 'chill' ? 'text-[#4A1818]' : 'text-black'}`} />
                                </div>
                              )}
                            </div>
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

        <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 mb-12`}>
          {/* Events */}
          {(() => {
            const style = mode === 'chaos' ? getSpecificCardStyle('events') : getCardStyle('work')
            const mintColor = mode === 'chaos' ? '#00A3E0' : '#00FF87' // Work section uses Ocean from BLUE SYSTEM
            
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
                return mode === 'chaos' ? '#1B4D7C' : '#9D4EFF' // Navy from BLUE SYSTEM
              }
              
              // Holidays
              if (calendarId.includes('holiday')) {
                return mode === 'chaos' ? '#FFD700' : '#FFC043' // Golden Yellow from BLUE SYSTEM contrast
              }
              
              // Office events (default)
              return mode === 'chaos' ? '#00A3E0' : '#00FF87' // Ocean from BLUE SYSTEM
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
              <Card className={`${style.bg} ${style.border} p-6 ${getRoundedClass('rounded-[2.5rem]')} ${eventsExpanded ? 'md:col-span-2' : 'md:col-span-1'}`}
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
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: mode === 'chaos' ? '#1E3A8A' : '#9D4EFF' }}></div>
                          <span className={`text-[10px] ${style.text}/80`}>Strategy Team</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: mode === 'chaos' ? '#EAB308' : '#FFC043' }}></div>
                          <span className={`text-[10px] ${style.text}/80`}>Holidays</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: mode === 'chaos' ? '#0EA5E9' : '#00FF87' }}></div>
                          <span className={`text-[10px] ${style.text}/80`}>Office Events</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Calendar Container with darker background */}
                    <div className={`${getRoundedClass('rounded-xl')} p-4 border-2`} style={{ 
                      backgroundColor: mode === 'chaos' ? '#1E3A8A' : mode === 'chill' ? 'rgba(255, 255, 255, 0.5)' : '#000000',
                      borderColor: mode === 'chaos' ? '#0EA5E9' : mode === 'chill' ? 'rgba(74, 24, 24, 0.2)' : '#FFFFFF'
                    }}>
                      {/* Day headers with dividers */}
                      <div className="grid grid-cols-7 mb-3 pb-3" style={{ borderBottom: `1px solid ${mode === 'chaos' ? 'rgba(14, 165, 233, 0.3)' : mode === 'chill' ? 'rgba(74, 24, 24, 0.2)' : 'rgba(255, 255, 255, 0.3)'}` }}>
                        {getWeekDays().map((day, index) => {
                          const isToday = day.toDateString() === now.toDateString()
                          const dayName = day.toLocaleDateString('en-US', { weekday: 'short' })
                          const dayNumber = day.getDate()
                          return (
                            <div 
                              key={index} 
                              className="text-center relative"
                              style={{ 
                                borderRight: index < 6 ? `1px solid ${mode === 'chaos' ? 'rgba(14, 165, 233, 0.3)' : mode === 'chill' ? 'rgba(74, 24, 24, 0.2)' : 'rgba(255, 255, 255, 0.3)'}` : 'none'
                              }}
                            >
                              <p className={`text-xs font-black uppercase mb-1`} style={{ color: isToday ? mintColor : (mode === 'chaos' ? '#FFFFFF' : mode === 'chill' ? '#4A1818' : '#FFFFFF') }}>
                                {isToday ? 'TODAY' : dayName}
                              </p>
                              <p className={`text-sm font-black`} style={{ color: mode === 'chaos' ? '#FFFFFF' : mode === 'chill' ? '#4A1818' : '#FFFFFF' }}>{dayNumber}</p>
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
                                    return (
                                      <div 
                                        key={index} 
                                        className="flex-1 h-12"
                                        style={{ 
                                          borderRight: index < 6 ? `1px solid ${mode === 'chaos' ? 'rgba(14, 165, 233, 0.2)' : mode === 'chill' ? 'rgba(74, 24, 24, 0.15)' : 'rgba(255, 255, 255, 0.2)'}` : 'none'
                                        }}
                                      ></div>
                                    )
                                  }
                                  
                                  const isStart = index === span.startDay
                                  const isEnd = index === span.endDay
                                  
                                  return (
                                    <div
                                      key={index}
                                      className={`flex-1 h-12 ${getRoundedClass(isStart && isEnd ? 'rounded-lg' : isStart ? 'rounded-l-lg' : isEnd ? 'rounded-r-lg' : '')} flex items-center px-2`}
                                      style={{ 
                                        backgroundColor: `${eventColor}88`,
                                        borderLeft: isStart ? `3px solid ${eventColor}` : 'none',
                                        borderRight: index < 6 ? `1px solid ${mode === 'chaos' ? 'rgba(14, 165, 233, 0.2)' : mode === 'chill' ? 'rgba(74, 24, 24, 0.15)' : 'rgba(255, 255, 255, 0.2)'}` : 'none',
                                      }}
                                    >
                                      {isStart && (
                                        <div className="flex-1 min-w-0">
                                          <p className={`text-xs font-black truncate`} style={{ color: mode === 'chaos' ? '#000000' : mode === 'chill' ? '#4A1818' : '#FFFFFF' }}>{event.summary}</p>
                                          <p className={`text-[10px]`} style={{ color: mode === 'chaos' ? 'rgba(0, 0, 0, 0.7)' : mode === 'chill' ? 'rgba(74, 24, 24, 0.7)' : 'rgba(255, 255, 255, 0.7)' }}>{formatEventTime(event)}</p>
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
          <div className={`${eventsExpanded ? 'md:col-span-1' : 'md:col-span-2'} flex flex-col ${eventsExpanded ? 'gap-4 h-full' : 'gap-6'}`}>
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
                              backgroundColor: mode === 'chaos' ? 'rgba(14, 165, 233, 0.3)' : mode === 'chill' ? 'rgba(74,24,24,0.25)' : 'rgba(0,0,0,0.35)',
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
                      <div className="flex gap-4 items-center">
                      {stats.map((stat, index) => (
                        <div 
                          key={stat.label} 
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
              const pipelineStyle = mode === 'chaos' ? getSpecificCardStyle('pipeline') : getCardStyle('work')
              const borderColor = pipelineStyle.accent
              
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
              
                      return (
                <>
                  <Card 
                    className={`${pipelineStyle.bg} ${pipelineStyle.border} ${eventsExpanded ? 'p-6 flex-[2]' : 'p-6'} ${getRoundedClass('rounded-[2.5rem]')} transition-all duration-300 overflow-hidden`}
                    style={pipelineStyle.glow ? { boxShadow: `0 0 40px ${pipelineStyle.glow}` } : {}}
                  >
                    {!eventsExpanded && (
                      <h2 className={`text-3xl mb-3 font-black uppercase ${pipelineStyle.text} transition-all duration-300`}>PIPELINE</h2>
                    )}
                    
                    {eventsExpanded ? (
                      /* Stats view when events expanded - Clean vertical layout */
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
                          <div className={`text-base ${pipelineStyle.text} font-normal tracking-wide`}>Pending</div>
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
                          <div className={`text-base ${pipelineStyle.text} font-normal tracking-wide`}>Long Lead</div>
                          <div 
                            className={`text-5xl font-black ${pipelineStyle.text} px-4 py-2 rounded-lg`}
                            style={{
                              backgroundColor: mode === 'chaos' ? 'rgba(14, 165, 233, 0.3)' : mode === 'chill' ? 'rgba(74,24,24,0.25)' : 'rgba(0,0,0,0.35)',
                            }}
                          >
                            {pipelineLoading ? '0' : statusCounts['Long Lead']}
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
                      /* Full view when events not expanded */
                      <div className="grid grid-cols-1 lg:grid-cols-2 divide-x" style={{ borderColor: `${borderColor}40` }}>
                      {/* Left Half - IN PROGRESS */}
                      <div className="flex flex-col pr-4">
                        <div className="flex items-center gap-3 mb-4">
                          <h3 className={`text-lg font-semibold ${pipelineStyle.text}`}>IN PROGRESS</h3>
                          <Badge 
                            variant="secondary" 
                            className="text-[10px]"
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
                              <div className={`${pipelineStyle.text}/60 text-sm py-4`}>
                                No projects in progress
                  </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Half - COMPLETED */}
                      <div className="flex flex-col pl-4">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className={`text-lg font-semibold ${pipelineStyle.text}`}>COMPLETED</h3>
                          
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
                              <div className={`${pipelineStyle.text}/60 text-sm py-4`}>
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
              {(() => {
                const colors = getSectionAccentColors('community')
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Ask The Hive */}
          {(() => {
            const style = mode === 'chaos' ? getSpecificCardStyle('ask-hive') : getCardStyle('community')
            return (
              <Card className={`${style.bg} ${style.border} p-6 ${getRoundedClass('rounded-[2.5rem]')} md:col-span-1`}
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
                <Button className={`w-full ${mode === 'chaos' ? 'bg-black text-[#F87171] hover:bg-[#0F0F0F]' : mode === 'chill' ? 'bg-[#4A1818] text-[#8B4444] hover:bg-[#3A1414]' : 'bg-white text-black hover:bg-[#e5e5e5]'} font-black rounded-full h-10 text-sm uppercase`}>
              Ask Question
            </Button>
          </Card>
            )
          })()}

        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* Loom Standup */}
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

        <div className="grid grid-cols-1 gap-6 mb-12">
          {/* Search */}
          {(() => {
            const style = mode === 'chaos' ? getSpecificCardStyle('search') : getCardStyle('vibes')
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
                tracks: []
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
