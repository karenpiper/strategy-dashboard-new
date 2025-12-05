'use client'

import { useOnlineUsers } from '@/hooks/useOnlineUsers'
import { Users, Circle } from 'lucide-react'
import { useMode } from '@/contexts/mode-context'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface OnlineUsersProps {
  maxDisplay?: number
  showCount?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function OnlineUsers({ maxDisplay = 5, showCount = true, size = 'md' }: OnlineUsersProps) {
  const { onlineUsers, isOnline } = useOnlineUsers()
  const { mode } = useMode()

  const getRoundedClass = (base: string) => {
    if (mode === 'chaos') return base.replace('rounded', 'rounded-[1.5rem]')
    if (mode === 'chill') return base.replace('rounded', 'rounded-2xl')
    return base
  }

  const getTextClass = () => {
    if (mode === 'chaos') return 'text-white'
    if (mode === 'chill') return 'text-[#4A1818]'
    return 'text-white'
  }

  const getBgClass = () => {
    if (mode === 'chaos') return 'bg-[#2A2A2A]'
    if (mode === 'chill') return 'bg-white'
    return 'bg-[#1a1a1a]'
  }

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  }

  const displayedUsers = onlineUsers.slice(0, maxDisplay)
  const remainingCount = Math.max(0, onlineUsers.length - maxDisplay)

  if (onlineUsers.length === 0) {
    return null
  }

  return (
    <div className="flex items-center gap-2">
      {showCount && (
        <div className={`flex items-center gap-2 ${getTextClass()}`}>
          <Circle className={`w-2 h-2 ${isOnline ? 'text-green-500' : 'text-gray-400'}`} fill="currentColor" />
          <span className="text-sm font-medium">{onlineUsers.length}</span>
        </div>
      )}
      
      <div className="flex items-center -space-x-2">
        <TooltipProvider>
          {displayedUsers.map((user) => (
            <Tooltip key={user.id}>
              <TooltipTrigger asChild>
                <div className={`${sizeClasses[size]} ${getRoundedClass('rounded-full')} border-2 ${getBgClass()}`} style={{ borderColor: mode === 'chaos' ? '#333333' : mode === 'chill' ? '#E5E5E5' : '#333333' }}>
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.full_name || user.email || 'User'}
                      className={`${sizeClasses[size]} ${getRoundedClass('rounded-full')} object-cover`}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                        const parent = target.parentElement
                        if (parent) {
                          const fallback = parent.querySelector('.online-user-fallback') as HTMLElement
                          if (fallback) fallback.style.display = 'flex'
                        }
                      }}
                    />
                  ) : null}
                  <div className={`online-user-fallback ${sizeClasses[size]} ${getRoundedClass('rounded-full')} flex items-center justify-center ${user.avatar_url ? 'hidden' : ''}`} style={{ backgroundColor: mode === 'chaos' ? '#00C896' : mode === 'chill' ? '#C8D961' : '#FFFFFF' }}>
                    <Users className={`${size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-4 h-4' : 'w-5 h-5'}`} style={{ color: mode === 'chill' ? '#4A1818' : '#FFFFFF' }} />
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">{user.full_name || user.email || 'User'}</p>
                {user.role && <p className="text-xs text-gray-400">{user.role}</p>}
              </TooltipContent>
            </Tooltip>
          ))}
          
          {remainingCount > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={`${sizeClasses[size]} ${getRoundedClass('rounded-full')} border-2 ${getBgClass()} flex items-center justify-center`} style={{ borderColor: mode === 'chaos' ? '#333333' : mode === 'chill' ? '#E5E5E5' : '#333333' }}>
                  <span className={`text-xs font-bold ${getTextClass()}`}>+{remainingCount}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{remainingCount} more {remainingCount === 1 ? 'user' : 'users'} online</p>
              </TooltipContent>
            </Tooltip>
          )}
        </TooltipProvider>
      </div>
    </div>
  )
}

