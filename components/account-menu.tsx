'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { useMode } from '@/contexts/mode-context'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogOut, User, Bell } from 'lucide-react'
import { User as UserIcon } from 'lucide-react'

interface UserProfile {
  avatar_url: string | null
  full_name: string | null
  email: string | null
}

export function AccountMenu() {
  const { user, signOut } = useAuth()
  const { mode } = useMode()
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const getRoundedClass = (base: string) => {
    if (mode === 'chaos') return base.replace('rounded', 'rounded-[1.5rem]')
    if (mode === 'chill') return base.replace('rounded', 'rounded-2xl')
    return base
  }

  useEffect(() => {
    async function fetchProfile() {
      if (!user) {
        setLoading(false)
        return
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('avatar_url, full_name, email')
          .eq('id', user.id)
          .single()

        if (error) {
          console.error('Error fetching profile:', error)
        } else {
          setProfile(data)
        }
      } catch (error) {
        console.error('Error in fetchProfile:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [user, supabase])

  if (!user) {
    return null
  }

  const avatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url || null
  const displayName = profile?.full_name || user.user_metadata?.full_name || user.email || 'User'
  
  // Generate initials for fallback
  const getInitials = (name: string, email: string) => {
    if (name && name !== email) {
      const parts = name.split(' ')
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      }
      return name.substring(0, 2).toUpperCase()
    }
    return email.substring(0, 2).toUpperCase()
  }
  
  const initials = getInitials(displayName, user.email || '')

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={`relative ${getRoundedClass('rounded-full')} border-2 transition-all hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 overflow-hidden ${
            mode === 'chaos' ? 'border-[#C4F500]/40 focus:ring-[#C4F500]' :
            mode === 'chill' ? 'border-[#FFC043]/40 focus:ring-[#FFC043]' :
            'border-white/20 focus:ring-white'
          }`}
          aria-label="Account menu"
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-10 h-10 rounded-full object-cover"
              onError={(e) => {
                // Hide image and show fallback on error
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
                const parent = target.parentElement
                if (parent) {
                  const fallback = parent.querySelector('.avatar-fallback') as HTMLElement
                  if (fallback) fallback.style.display = 'flex'
                }
              }}
            />
          ) : null}
          <div 
            className={`avatar-fallback w-10 h-10 ${getRoundedClass('rounded-full')} flex items-center justify-center text-sm font-semibold ${
              avatarUrl ? 'hidden' : ''
            } ${
              mode === 'chaos' ? 'bg-[#C4F500] text-black' :
              mode === 'chill' ? 'bg-[#FFC043] text-[#4A1818]' :
              'bg-white text-black'
            }`}
          >
            {initials}
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{displayName}</p>
            {user.email && (
              <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push('/profile')}>
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push('/settings/notifications')}>
          <Bell className="mr-2 h-4 w-4" />
          <span>Notification Settings</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

