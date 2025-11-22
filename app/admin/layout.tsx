'use client'

import { useMode } from '@/contexts/mode-context'
import { PermissionsProvider, usePermissions } from '@/contexts/permissions-context'
import { useAuth } from '@/contexts/auth-context'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { 
  Home, 
  FileText, 
  Briefcase, 
  FolderOpen, 
  GitBranch, 
  Crown, 
  Music, 
  Bell, 
  Users, 
  RotateCw,
  LogOut,
  Shield,
  Settings,
  Upload
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEffect } from 'react'
import { getRoleDisplayName, getSpecialAccessDisplayName } from '@/lib/permissions'
import { AccountMenu } from '@/components/account-menu'

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

  // Theme-aware styling helpers
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
      case 'chill': return 'border-[#8B4444]/30'
      case 'code': return 'border-[#FFFFFF]/30'
      default: return 'border-[#333333]'
    }
  }

  const getRoundedClass = (base: string) => {
    if (mode === 'chaos') return base.replace('rounded', 'rounded-[1.5rem]')
    if (mode === 'chill') return base.replace('rounded', 'rounded-2xl')
    return base
  }

  const getNavItemStyle = (isActive: boolean) => {
    if (isActive) {
      switch (mode) {
        case 'chaos': return 'bg-[#C4F500] text-black'
        case 'chill': return 'bg-[#FFC043] text-[#4A1818]'
        case 'code': return 'bg-[#FFFFFF] text-black'
        default: return 'bg-primary text-primary-foreground'
      }
    } else {
      return `${getTextClass()}/60 hover:${getTextClass()} hover:bg-black/10`
    }
  }

  // Navigation sections matching the old admin structure
  const navSections = [
    {
      title: 'PROFILE',
      items: [
        { href: '/admin', label: 'Admin Homepage', icon: Home, permission: null },
      ]
    },
    {
      title: 'CONTENT MANAGEMENT',
      items: [
        { href: '/admin/must-read', label: 'Must Reads', icon: FileText, permission: null },
        { href: '/admin/work-sample', label: 'Work Samples', icon: Briefcase, permission: null },
        { href: '/admin/content', label: 'Resources', icon: FolderOpen, permission: 'canManageContent' as const },
        { href: '/admin/pipeline', label: 'Pipeline', icon: GitBranch, permission: null },
        { href: '/admin/beast-babe', label: 'Beast Babe', icon: Crown, permission: 'canPassBeastBabe' as const },
        { href: '/admin/playlists', label: 'Playlist', icon: Music, permission: 'canManagePlaylists' as const },
      ]
    },
    {
      title: 'ADMINISTRATION',
      items: [
        { href: '/admin/notifications', label: 'Push Notifications', icon: Bell, permission: 'canManageUsers' as const },
        { href: '/admin/users', label: 'Set Curator', icon: Users, permission: 'canManageUsers' as const },
        { href: '/admin/curator-rotation', label: 'Curator Rotation', icon: RotateCw, permission: 'canManageUsers' as const },
      ]
    }
  ]

  return (
    <div className={`min-h-screen ${getBgClass()} ${getTextClass()} ${mode === 'code' ? 'font-mono' : 'font-[family-name:var(--font-raleway)]'}`}>
      {/* Sidebar Navigation */}
      <aside className={`fixed left-0 top-0 h-full w-64 border-r ${getBorderClass()} ${getBgClass()} p-6 overflow-y-auto`}>
        <div className="mb-8">
          <h1 className={`text-2xl font-black uppercase tracking-wider ${getTextClass()} mb-1`}>Admin Panel</h1>
        </div>

        {/* User Profile Section */}
        {authUser && (
          <div className={`mb-6 p-3 ${getRoundedClass('rounded-lg')} border ${getBorderClass()}`}>
            <div className="flex items-center gap-3 mb-2">
              <AccountMenu />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="w-3 h-3" />
                  <span className={`text-xs font-medium ${getTextClass()}`}>
                    {user ? getRoleDisplayName(user.baseRole) : 'User'}
                  </span>
                </div>
                <p className={`text-xs ${getTextClass()}/70 truncate`}>
                  {authUser.user_metadata?.full_name || authUser.email || 'User'}
                </p>
              </div>
            </div>
            {user?.specialAccess.length > 0 && (
              <div className="space-y-1 mt-2">
                {user.specialAccess.map((access) => (
                  <div key={access} className="flex items-center gap-2">
                    <Crown className="w-3 h-3 text-yellow-500" />
                    <span className={`text-xs ${getTextClass()}/70`}>
                      {getSpecialAccessDisplayName(access)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Admin Tools Button */}
        <div className="mb-6">
          <Button
            onClick={() => router.push('/admin')}
            className={`w-full ${getRoundedClass('rounded-lg')} ${
              mode === 'chaos' ? 'bg-[#C4F500] text-black hover:bg-[#C4F500]/80' :
              mode === 'chill' ? 'bg-[#FFC043] text-[#4A1818] hover:bg-[#FFC043]/80' :
              'bg-[#FFFFFF] text-black hover:bg-[#FFFFFF]/80'
            }`}
          >
            <Settings className="w-4 h-4 mr-2" />
            Admin Tools
          </Button>
        </div>
        
        {/* Navigation Sections */}
        <nav className="space-y-6">
          {navSections.map((section) => (
            <div key={section.title}>
              <h2 className={`text-xs font-bold uppercase tracking-wider mb-3 ${getTextClass()}/50`}>
                {section.title}
              </h2>
              <div className="space-y-1">
                {section.items.map((item) => {
                  // Check permissions if required
                  if (item.permission && !permissions?.[item.permission]) {
                    return null
                  }
                  
                  const Icon = item.icon
                  const isActive = pathname === item.href || (item.href !== '/admin' && pathname?.startsWith(item.href))
                  
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2 ${getRoundedClass('rounded-lg')} transition-colors text-sm ${
                        getNavItemStyle(isActive)
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="font-medium uppercase tracking-wider text-sm">{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom Actions */}
        <div className="mt-8 pt-8 border-t space-y-2">
          <Link
            href="/"
            className={`flex items-center gap-3 px-3 py-2 ${getRoundedClass('rounded-lg')} ${getTextClass()}/60 hover:${getTextClass()} hover:bg-black/10 transition-colors text-sm`}
          >
            <Home className="w-4 h-4" />
            <span className="font-medium">← Back to Dashboard</span>
          </Link>
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
  return (
    <PermissionsProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </PermissionsProvider>
  )
}
