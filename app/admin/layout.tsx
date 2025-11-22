'use client'

import { useMode } from '@/contexts/mode-context'
import { PermissionsProvider, usePermissions } from '@/contexts/permissions-context'
import { useAuth } from '@/contexts/auth-context'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Settings, Music, Sparkles, Cloud, FileText, BarChart3, Home, Users, Shield, Crown, Zap, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEffect } from 'react'
import { getRoleDisplayName, getSpecialAccessDisplayName } from '@/lib/permissions'

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const { mode } = useMode()
  const pathname = usePathname()
  const router = useRouter()
  const { user: authUser, signOut } = useAuth()
  const { user, permissions, isLoading } = usePermissions()

  // Allow all users to access admin - access control handled within pages
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading permissions...</p>
        </div>
      </div>
    )
  }

  const navItems = [
    { 
      href: '/admin', 
      label: 'Dashboard', 
      icon: Home,
      permission: 'canViewAdmin' as const,
    },
    { 
      href: '/admin/playlists', 
      label: 'Playlists', 
      icon: Music,
      permission: 'canManagePlaylists' as const,
    },
    { 
      href: '/admin/horoscopes', 
      label: 'Horoscopes', 
      icon: Sparkles,
      permission: 'canManageHoroscopes' as const,
    },
    { 
      href: '/admin/weather', 
      label: 'Weather', 
      icon: Cloud,
      permission: 'canManageWeather' as const,
    },
    { 
      href: '/admin/content', 
      label: 'Content Cards', 
      icon: FileText,
      permission: 'canManageContent' as const,
    },
    { 
      href: '/admin/stats', 
      label: 'Stats & Metrics', 
      icon: BarChart3,
      permission: 'canViewAdmin' as const,
    },
    { 
      href: '/admin/users', 
      label: 'User Management', 
      icon: Users,
      permission: 'canManageUsers' as const,
    },
    { 
      href: '/admin/beast-babe', 
      label: 'Beast Babe Torch', 
      icon: Zap,
      permission: 'canPassBeastBabe' as const,
    },
    { 
      href: '/admin/settings', 
      label: 'Settings', 
      icon: Settings,
      permission: 'canManageSettings' as const,
    },
  ]

  // Filter nav items based on permissions - show all items but pages will handle access control
  // Show Dashboard to everyone, other items based on permissions
  const visibleNavItems = navItems.filter(item => {
    if (item.href === '/admin') return true // Dashboard accessible to all
    return permissions?.[item.permission] || false
  })

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar Navigation */}
      <aside className="fixed left-0 top-0 h-full w-64 border-r border-border bg-card p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Admin CMS</h1>
          <p className="text-sm text-muted-foreground mt-1">Content Management</p>
        </div>

        {/* User Role Display */}
        {user && (
          <div className="mb-6 p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-medium text-foreground">
                {getRoleDisplayName(user.baseRole)}
              </span>
            </div>
            {user.specialAccess.length > 0 && (
              <div className="space-y-1">
                {user.specialAccess.map((access) => (
                  <div key={access} className="flex items-center gap-2">
                    <Crown className="w-3 h-3 text-yellow-500" />
                    <span className="text-xs text-muted-foreground">
                      {getSpecialAccessDisplayName(access)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        <nav className="space-y-2">
          {visibleNavItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || (item.href !== '/admin' && pathname?.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="mt-8 pt-8 border-t border-border space-y-2">
          <Link
            href="/"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Home className="w-5 h-5" />
            <span className="font-medium">Back to Dashboard</span>
          </Link>
          {authUser && (
            <button
              onClick={signOut}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Sign Out</span>
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">
        {children}
      </main>
    </div>
  )
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // PermissionsProvider requires AuthProvider, which is already in root layout
  return (
    <PermissionsProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </PermissionsProvider>
  )
}
