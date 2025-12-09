import { useState, useEffect, useCallback, useRef } from 'react'

interface CardSettings {
  [cardName: string]: {
    is_visible: boolean
    display_order: number
  }
}

export function useDashboardCardSettings() {
  const [cardSettings, setCardSettings] = useState<CardSettings>({})
  const [loading, setLoading] = useState(true)
  // Use refs to store everything to avoid dependency issues
  const settingsRef = useRef<CardSettings>({})
  const loadingRef = useRef(true)
  const hasFetchedRef = useRef(false)

  useEffect(() => {
    // Only fetch once
    if (hasFetchedRef.current) return
    
    let isMounted = true
    hasFetchedRef.current = true

    async function fetchSettings() {
      try {
        const response = await fetch('/api/dashboard-cards')
        const result = await response.json()

        if (!isMounted) return

        if (response.ok && result.settings) {
          settingsRef.current = result.settings
          setCardSettings(result.settings)
        } else {
          // If settings can't be loaded, default to all visible
          console.warn('Failed to load card settings, defaulting to all visible')
          settingsRef.current = {}
          setCardSettings({})
        }
      } catch (error) {
        console.error('Error fetching card settings:', error)
        // Default to all visible on error
        if (isMounted) {
          settingsRef.current = {}
          setCardSettings({})
        }
      } finally {
        if (isMounted) {
          loadingRef.current = false
          setLoading(false)
        }
      }
    }

    fetchSettings()

    return () => {
      isMounted = false
    }
  }, []) // Empty deps - only run once

  // Check if a card should be visible
  // TEMPORARILY DISABLED: Always return true to prevent infinite re-render issues
  // TODO: Re-enable after debugging the re-render issue
  const isCardVisible = useCallback((cardName: string): boolean => {
    return true // Always show all cards for now
    // Original implementation (disabled):
    // if (loadingRef.current || !settingsRef.current || Object.keys(settingsRef.current).length === 0) {
    //   return true
    // }
    // const setting = settingsRef.current[cardName]
    // return setting ? setting.is_visible : true
  }, []) // No dependencies - completely stable function

  return {
    cardSettings,
    isCardVisible,
    loading
  }
}

