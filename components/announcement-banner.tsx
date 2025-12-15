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
  text_format: 'days_until' | 'happens_in' | 'custom' | null
  custom_format: string | null
  sticker_url: string | null
  start_date: string
  end_date: string | null
  active: boolean
  working_days_only: boolean | null
}

export function AnnouncementBanner() {
  const { mode } = useMode()
  const [announcement, setAnnouncement] = useState<Announcement | null>(null)
  const [loading, setLoading] = useState(true)
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null)

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

  // Helper function to check if a date is a weekend
  const isWeekend = (date: Date): boolean => {
    const day = date.getDay()
    return day === 0 || day === 6 // Sunday = 0, Saturday = 6
  }

  // Helper function to count working days between two dates (inclusive)
  const countWorkingDays = (start: Date, end: Date): number => {
    let count = 0
    const current = new Date(start)
    current.setHours(0, 0, 0, 0)
    const endDate = new Date(end)
    endDate.setHours(0, 0, 0, 0)

    // If end is before start, return 0
    if (endDate < current) {
      return 0
    }

    // Count working days from start to end (inclusive)
    while (current <= endDate) {
      if (!isWeekend(current)) {
        count++
      }
      current.setDate(current.getDate() + 1)
    }
    return count
  }

  // Calculate days remaining
  useEffect(() => {
    if (!announcement || announcement.mode !== 'countdown' || !announcement.target_date) {
      setDaysRemaining(null)
      return
    }

    const updateCountdown = () => {
      const now = new Date()
      const target = new Date(announcement.target_date!)
      const difference = target.getTime() - now.getTime()

      if (difference <= 0) {
        setDaysRemaining(null)
        return
      }

      // If working_days_only is true, count only weekdays (excluding weekends)
      if (announcement.working_days_only) {
        const workingDays = countWorkingDays(now, target)
        setDaysRemaining(Math.max(0, workingDays))
      } else {
        // Calculate days (round up to include partial days, minimum 0)
        const days = Math.max(0, Math.ceil(difference / (1000 * 60 * 60 * 24)))
        setDaysRemaining(days)
      }
    }

    updateCountdown()
    // Update once per day instead of every second
    const interval = setInterval(updateCountdown, 60 * 60 * 1000) // Every hour

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
    const isExpired = daysRemaining === null || daysRemaining <= 0
    const format = announcement.text_format || 'days_until'
    const isWorkingDays = announcement.working_days_only || false
    const dayLabel = isWorkingDays 
      ? (daysRemaining === 1 ? 'working day' : 'working days')
      : (daysRemaining === 1 ? 'day' : 'days')
    
    let displayText = ''
    if (isExpired) {
      displayText = `${announcement.event_name} has passed`
    } else if (format === 'custom' && announcement.custom_format) {
      // Custom format: replace {days} and {event} variables
      displayText = announcement.custom_format
        .replace(/{days}/g, daysRemaining.toString())
        .replace(/{event}/g, announcement.event_name)
    } else if (format === 'happens_in') {
      displayText = `${announcement.event_name} happens in ${daysRemaining} ${dayLabel}`
    } else {
      // Default: 'days_until'
      displayText = `${daysRemaining} ${dayLabel} until ${announcement.event_name}`
    }
    

    // Create repeating text with sticker breakers
    const renderScrollingText = () => {
      const repetitions = 3
      const elements = []
      
      for (let i = 0; i < repetitions; i++) {
        elements.push(
          <span key={`text-${i}`} className="text-white text-[clamp(2.5rem,8vw,5rem)] font-black uppercase leading-none tracking-[0.15em] inline-block">
            {displayText}
          </span>
        )
        if (i < repetitions - 1) {
          if (announcement.sticker_url) {
            elements.push(
              <img
                key={`sticker-${i}`}
                src={announcement.sticker_url}
                alt=""
                className="inline-block h-[clamp(2.5rem,8vw,5rem)] w-auto mx-6 align-middle flex-shrink-0"
                style={{ objectFit: 'contain' }}
              />
            )
          } else {
            elements.push(
              <span key={`bullet-${i}`} className="text-white text-[clamp(2.5rem,8vw,5rem)] mx-6">•</span>
            )
          }
        }
      }
      
      return elements
    }

    return (
      <div className="mb-6">
        <Card className={`bg-transparent border-0 p-0 ${getRoundedClass()} w-full overflow-hidden`}>
          <div className="relative h-20 md:h-24 overflow-hidden">
            <div className="absolute inset-0 flex items-center">
              <div className="animate-scroll-text whitespace-nowrap flex items-center">
                {renderScrollingText()}
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
  // Create repeating text with sticker breakers
  const renderScrollingText = () => {
    const repetitions = 3
    const elements = []
    
    for (let i = 0; i < repetitions; i++) {
      elements.push(
        <span key={`text-${i}`} className="text-white text-[clamp(2.5rem,8vw,5rem)] font-black uppercase leading-none tracking-[0.15em] inline-block">
          {announcement.headline}
        </span>
      )
      if (i < repetitions - 1) {
        if (announcement.sticker_url) {
          elements.push(
            <img
              key={`sticker-${i}`}
              src={announcement.sticker_url}
              alt=""
              className="inline-block h-[clamp(2.5rem,8vw,5rem)] w-auto mx-4 align-middle"
            />
          )
        } else {
          elements.push(
            <span key={`bullet-${i}`} className="text-white text-[clamp(2.5rem,8vw,5rem)] mx-4">•</span>
          )
        }
      }
    }
    
    return elements
  }

  return (
    <div className="mb-6">
      <Card className={`bg-transparent border-0 p-0 ${getRoundedClass()} w-full overflow-hidden`}>
        <div className="relative h-20 md:h-24 overflow-hidden">
          <div className="absolute inset-0 flex items-center">
            <div className="animate-scroll-text whitespace-nowrap flex items-center">
              {renderScrollingText()}
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

