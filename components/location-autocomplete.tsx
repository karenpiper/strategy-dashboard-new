'use client'

import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Loader2 } from 'lucide-react'

interface LocationSuggestion {
  display_name: string
  place_id: number
  lat?: string
  lon?: string
}

interface LocationAutocompleteProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  onTimezoneDetected?: (timezone: string) => void
}

export function LocationAutocomplete({
  value,
  onChange,
  placeholder = "e.g., New York, NY",
  className = "w-full",
  onTimezoneDetected
}: LocationAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Debounced search function
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    if (value.length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    setLoading(true)
    debounceTimerRef.current = setTimeout(async () => {
      try {
        // Use Nominatim API for location search (free, no API key needed)
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}&limit=5&addressdetails=1`,
          {
            headers: {
              'User-Agent': 'Strategy Dashboard App' // Required by Nominatim
            }
          }
        )

        if (!response.ok) {
          throw new Error('Failed to fetch suggestions')
        }

        const data = await response.json()
        // Map the data to include lat/lon for timezone lookup
        const mappedSuggestions = data.slice(0, 5).map((item: any) => ({
          display_name: item.display_name,
          place_id: item.place_id,
          lat: item.lat,
          lon: item.lon
        }))
        setSuggestions(mappedSuggestions)
        setShowSuggestions(true)
      } catch (error) {
        console.error('Error fetching location suggestions:', error)
        setSuggestions([])
      } finally {
        setLoading(false)
      }
    }, 300) // 300ms debounce

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [value])

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => 
        prev < suggestions.length - 1 ? prev + 1 : prev
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault()
      handleSelect(suggestions[selectedIndex])
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
      setSelectedIndex(-1)
    }
  }

  const handleSelect = async (suggestion: LocationSuggestion) => {
    onChange(suggestion.display_name)
    setShowSuggestions(false)
    setSelectedIndex(-1)
    inputRef.current?.blur()
    
    // Fetch timezone for the selected location
    if (onTimezoneDetected && suggestion.lat && suggestion.lon) {
      try {
        // Use timeapi.io free API to get timezone from coordinates
        const tzResponse = await fetch(
          `https://timeapi.io/api/TimeZone/coordinate?latitude=${suggestion.lat}&longitude=${suggestion.lon}`
        )
        
        if (tzResponse.ok) {
          const tzData = await tzResponse.json()
          if (tzData.timeZone) {
            onTimezoneDetected(tzData.timeZone)
            return
          }
        }
      } catch (error) {
        console.error('Error fetching timezone:', error)
      }
      
      // Fallback: try to infer timezone from location name
      const inferredTimezone = inferTimezoneFromLocation(suggestion.display_name)
      if (inferredTimezone && onTimezoneDetected) {
        onTimezoneDetected(inferredTimezone)
      }
    }
  }
  
  // Simple timezone inference from location name (fallback)
  const inferTimezoneFromLocation = (locationName: string): string | null => {
    const name = locationName.toLowerCase()
    // Common timezone mappings
    if (name.includes('new york') || name.includes('boston') || name.includes('washington')) {
      return 'America/New_York'
    }
    if (name.includes('chicago') || name.includes('dallas')) {
      return 'America/Chicago'
    }
    if (name.includes('los angeles') || name.includes('san francisco') || name.includes('seattle')) {
      return 'America/Los_Angeles'
    }
    if (name.includes('london')) {
      return 'Europe/London'
    }
    if (name.includes('paris')) {
      return 'Europe/Paris'
    }
    if (name.includes('tokyo')) {
      return 'Asia/Tokyo'
    }
    return null
  }

  const handleBlur = () => {
    // Delay hiding suggestions to allow click events to fire
    setTimeout(() => {
      setShowSuggestions(false)
      setSelectedIndex(-1)
    }, 200)
  }

  const handleFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true)
    }
  }

  return (
    <div className="relative">
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={className}
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
      
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.place_id}
              type="button"
              onClick={() => handleSelect(suggestion)}
              className={`w-full text-left px-3 py-2 text-sm text-black hover:bg-gray-100 focus:bg-gray-100 focus:outline-none transition-colors ${
                index === selectedIndex ? 'bg-gray-100' : ''
              }`}
            >
              {suggestion.display_name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

