'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface SnowContextType {
  snowEnabled: boolean
  toggleSnow: () => void
}

const SnowContext = createContext<SnowContextType | undefined>(undefined)

export function SnowProvider({ children }: { children: ReactNode }) {
  const [snowEnabled, setSnowEnabled] = useState<boolean>(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Load from localStorage, default to true (enabled)
    const savedSnow = localStorage.getItem('snow-enabled')
    if (savedSnow !== null) {
      setSnowEnabled(savedSnow === 'true')
    }
  }, [])

  useEffect(() => {
    if (mounted) {
      // Save to localStorage
      localStorage.setItem('snow-enabled', snowEnabled.toString())
    }
  }, [snowEnabled, mounted])

  const toggleSnow = () => {
    setSnowEnabled(prev => !prev)
  }

  if (!mounted) {
    return <>{children}</>
  }

  return (
    <SnowContext.Provider value={{ snowEnabled, toggleSnow }}>
      {children}
    </SnowContext.Provider>
  )
}

export function useSnow() {
  const context = useContext(SnowContext)
  if (context === undefined) {
    throw new Error('useSnow must be used within a SnowProvider')
  }
  return context
}

