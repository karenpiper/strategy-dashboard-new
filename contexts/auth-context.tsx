'use client'

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { useRouter, usePathname } from 'next/navigation'

interface AuthContextType {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  
  // Create supabase client once and memoize it
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    let mounted = true
    let timeoutId: NodeJS.Timeout | null = null

    // Get initial session with retry logic
    async function getInitialSession(retryCount = 0) {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error getting session:', error)
          // Retry once after a short delay if we get an error
          if (retryCount === 0 && mounted) {
            timeoutId = setTimeout(() => getInitialSession(1), 500)
            return
          }
        }
        
        if (mounted) {
          setUser(session?.user ?? null)
          setLoading(false)
          
          if (session) {
            console.log('Initial session loaded:', session.user.email)
          } else {
            console.log('No initial session found')
          }
        }
      } catch (error) {
        console.error('Error in getInitialSession:', error)
        // Retry once after a short delay
        if (retryCount === 0 && mounted) {
          timeoutId = setTimeout(() => getInitialSession(1), 500)
          return
        }
        if (mounted) {
          setLoading(false)
        }
      }
    }

    // Small delay to ensure cookies are available after OAuth redirect
    timeoutId = setTimeout(() => {
      getInitialSession()
    }, 100)

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email || 'no session')
      
      if (mounted) {
        setUser(session?.user ?? null)
        setLoading(false)
      }

      // Only redirect to login if we're not already on login/auth pages
      if (!session && event === 'SIGNED_OUT' && pathname && !pathname.startsWith('/login') && !pathname.startsWith('/auth')) {
        router.push('/login')
      }
    })

    return () => {
      mounted = false
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      subscription.unsubscribe()
    }
  }, [router, supabase, pathname])

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Error signing out:', error)
      }
      setUser(null)
      router.push('/login')
    } catch (error) {
      console.error('Error in signOut:', error)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

