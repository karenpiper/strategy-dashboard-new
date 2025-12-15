'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { useMode } from '@/contexts/mode-context'
import './announcement-banner.css'

interface Announcement {
  id: string
  headline: string
  mode: 'text' | 'countdown'
  event_name: string | null
  target_date: string | null
  start_date: string
  end_date: string | null
  active: boolean
}

export function AnnouncementBanner() {
  const { mode } = useMode()
  const [announcement, setAnnouncement] = useState<Announcement | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRemaining, setTimeRemaining] = useState<{
    days: number
    hours: number
    minutes: number
    seconds: number
  } | null>(null)

  useEffect(() => {
    async function fetchAnnouncement() {
      try {
        const response = await fetch('/api/announcements', {
          cache: 'no-store'
        })
        const result = await response.json()
        
        if (response.ok && result.data && result.data.length > 0) {
          setAnnouncement(result.data[0])
        }
      } catch (error) {
        console.error('Error fetching announcement:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAnnouncement()
  }, [])

  // Calculate countdown
  useEffect(() => {
    if (!announcement || announcement.mode !== 'countdown' || !announcement.target_date) {
      setTimeRemaining(null)
      return
    }

    const updateCountdown = () => {
      const now = new Date().getTime()
      const target = new Date(announcement.target_date!).getTime()
      const difference = target - now

      if (difference <= 0) {
        setTimeRemaining(null)
        return
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24))
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((difference % (1000 * 60)) / 1000)

      setTimeRemaining({ days, hours, minutes, seconds })
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)

    return () => clearInterval(interval)
  }, [announcement])

  if (loading || !announcement) {
    return null
  }

  const getRoundedClass = () => {
    if (mode === 'chaos') return 'rounded-[1.5rem]'
    if (mode === 'chill') return 'rounded-2xl'
    return 'rounded-none'
  }

  // Countdown mode
  if (announcement.mode === 'countdown' && announcement.event_name) {
    const isExpired = timeRemaining === null
    const displayText = isExpired 
      ? `${announcement.event_name} has passed`
      : `${announcement.event_name} in ${timeRemaining.days}d ${timeRemaining.hours}h ${timeRemaining.minutes}m ${timeRemaining.seconds}s`

    return (
      <div className="mb-6">
        <Card className={`bg-transparent border-0 p-0 ${getRoundedClass()} w-full overflow-hidden`}>
          <div className="relative h-20 md:h-24 overflow-hidden">
            <div className="absolute inset-0 flex items-center">
              <div className="animate-scroll-text whitespace-nowrap">
                <span className="text-white text-[clamp(2.5rem,8vw,5rem)] font-black uppercase leading-none tracking-tighter inline-block">
                  {displayText} • {displayText} • {displayText} • 
                </span>
              </div>
            </div>
            {/* Gradient overlays */}
            <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-transparent to-transparent z-10 pointer-events-none"></div>
            <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-transparent to-transparent z-10 pointer-events-none"></div>
          </div>
        </Card>
      </div>
    )
  }

  // Text mode - scrolling headline
  return (
    <div className="mb-6">
      <Card className={`bg-transparent border-0 p-0 ${getRoundedClass()} w-full overflow-hidden`}>
        <div className="relative h-20 md:h-24 overflow-hidden">
          <div className="absolute inset-0 flex items-center">
            <div className="animate-scroll-text whitespace-nowrap">
              <span className="text-white text-[clamp(2.5rem,8vw,5rem)] font-black uppercase leading-none tracking-tighter inline-block">
                {announcement.headline} • {announcement.headline} • {announcement.headline} • 
              </span>
            </div>
          </div>
          {/* Gradient overlays */}
          <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-transparent to-transparent z-10 pointer-events-none"></div>
          <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-transparent to-transparent z-10 pointer-events-none"></div>
        </div>
      </Card>
    </div>
  )
}

