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
  Upload,
  Newspaper,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useEffect, useState } from 'react'
import { getRoleDisplayName, getSpecialAccessDisplayName } from '@/lib/permissions'
import { AccountMenu } from '@/components/account-menu'

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const { mode } = useMode()
  const pathname = usePathname()
  const router = useRouter()
  const { user: authUser, signOut } = useAuth()
  const { user, permissions, isLoading } = usePermissions()
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({})

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
    if (mode === 'code') return 'rounded-none'
    // For rounded-[2.5rem] or similar, keep it to match the rest of the site (like snaps page)
    if (base.includes('rounded-[')) {
      return base // Keep the original rounded class to match site styling
    }
    // For simple 'rounded' classes, do the replacement
    if (mode === 'chaos') return base.replace('rounded', 'rounded-[1.5rem]')
    if (mode === 'chill') return base.replace('rounded', 'rounded-2xl')
    return base
  }

  const getNavLinkClass = (isActive = false) => {
    const base = `transition-colors text-sm font-black uppercase ${mode === 'code' ? 'font-mono' : ''}`
    if (isActive) {
      switch (mode) {
        case 'chaos': return `${base} text-white hover:text-[#C4F500]`
        case 'chill': return `${base} text-[#4A1818] hover:text-[#FFC043]`
        case 'code': return `${base} text-[#FFFFFF] hover:text-[#FFFFFF]`
        default: return `${base} text-white hover:text-[#C4F500]`
      }
    } else {
      switch (mode) {
        case 'chaos': return `${base} text-[#666666] hover:text-white`
        case 'chill': return `${base} text-[#8B4444] hover:text-[#4A1818]`
        case 'code': return `${base} text-[#808080] hover:text-[#FFFFFF]`
        default: return `${base} text-[#666666] hover:text-white`
      }
    }
  }

  const getLogoBg = () => {
    switch (mode) {
      case 'chaos': return 'bg-[#C4F500]'
      case 'chill': return 'bg-[#FFC043]'
      case 'code': return 'bg-[#FFFFFF]'
      default: return 'bg-[#C4F500]'
    }
  }

  const getLogoText = () => {
    switch (mode) {
      case 'chaos': return 'text-black'
      case 'chill': return 'text-[#4A1818]'
      case 'code': return 'text-black'
      default: return 'text-black'
    }
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

  // Helper function to check if user has access to a section
  const hasSectionAccess = (sectionKey: 'content' | 'leadership' | 'curation' | 'admin'): boolean => {
    if (!user) return false
    const role = user.baseRole
    
    // Admin has access to everything
    if (role === 'admin') return true
    
    // Contributor has access to content, leadership, and curation
    if (role === 'contributor') {
      return sectionKey === 'content' || sectionKey === 'leadership' || sectionKey === 'curation'
    }
    
    // Users only have access to content management
    if (role === 'user') {
      return sectionKey === 'content'
    }
    
    return false
  }

  // Navigation sections with new hierarchical structure
  const navSections = [
    {
      title: 'PROFILE',
      items: [
        { href: '/admin', label: 'Admin Homepage', icon: Home, permission: null, sectionAccess: null },
      ]
    },
    {
      title: 'CONTENT MANAGEMENT',
      sectionAccess: 'content' as const,
      items: [
        { href: '/admin/must-read', label: 'Must Reads', icon: FileText, permission: null, sectionAccess: 'content' as const },
        { href: '/admin/work-sample', label: 'Work Samples', icon: Briefcase, permission: null, sectionAccess: 'content' as const },
        { href: '/admin/content', label: 'Resources', icon: FolderOpen, permission: null, sectionAccess: 'content' as const },
      ]
    },
    {
      title: 'LEADERSHIP',
      sectionAccess: 'leadership' as const,
      items: [
        { href: '/admin/pipeline', label: 'Pipeline', icon: GitBranch, permission: null, sectionAccess: 'leadership' as const },
        { href: '/admin/news', label: 'News', icon: Newspaper, permission: null, sectionAccess: 'leadership' as const },
        { href: '/admin/curator-rotation', label: 'Curator Rotation', icon: RotateCw, permission: null, sectionAccess: 'leadership' as const },
      ]
    },
    {
      title: 'CURATION',
      sectionAccess: 'curation' as const,
      items: [
        { href: '/admin/playlists', label: 'Playlist', icon: Music, permission: 'canManagePlaylists' as const, sectionAccess: 'curation' as const },
        { href: '/admin/beast-babe', label: 'Beast Babe', icon: Crown, permission: 'canPassBeastBabe' as const, sectionAccess: 'curation' as const },
      ]
    },
    {
      title: 'ADMIN',
      sectionAccess: 'admin' as const,
      items: [
        { href: '/admin/users', label: 'User Management', icon: Users, permission: 'canManageUsers' as const, sectionAccess: 'admin' as const },
        { href: '/admin/notifications', label: 'Push Notifications', icon: Bell, permission: 'canManageUsers' as const, sectionAccess: 'admin' as const },
      ]
    }
  ]

  return (
    <div className={`min-h-screen ${getBgClass()} ${getTextClass()} ${mode === 'code' ? 'font-mono' : 'font-[family-name:var(--font-raleway)]'}`}>
      {/* Main Navigation Header - Fixed */}
      <header className={`border-b ${getBorderClass()} px-6 py-4 fixed top-0 left-0 right-0 z-50 ${getBgClass()}`}>
        <div className="max-w-[1200px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/">
              <div className={`w-10 h-10 ${getLogoBg()} ${getLogoText()} ${getRoundedClass('rounded-xl')} flex items-center justify-center font-black text-lg ${mode === 'code' ? 'font-mono' : ''} cursor-pointer`}>
                {mode === 'code' ? 'C:\\>' : 'D'}
              </div>
            </Link>
            <nav className="flex items-center gap-6">
              <Link href="/" className={getNavLinkClass()}>HOME</Link>
              <Link href="/snaps" className={getNavLinkClass()}>SNAPS</Link>
              <Link href="/resources" className={getNavLinkClass()}>RESOURCES</Link>
              <Link href="/work-samples" className={getNavLinkClass()}>WORK</Link>
              <a href="#" className={getNavLinkClass()}>TEAM</a>
              <Link href="/vibes" className={getNavLinkClass()}>VIBES</Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            {authUser && (
              <AccountMenu />
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area - Centered */}
      <main className="max-w-[1200px] mx-auto px-6 py-10 mt-20">
        <div className="flex gap-6">
          {/* Left Sidebar Card - 1/4 width - Fixed height, doesn't scroll */}
          <Card className={`w-1/4 ${mode === 'chaos' ? 'bg-[#1A5D52]' : mode === 'chill' ? 'bg-white' : 'bg-[#1a1a1a]'} ${getRoundedClass('rounded-[2.5rem]')} p-4 flex flex-col sticky top-24 h-fit`} style={{ 
            borderColor: mode === 'chaos' ? '#00C896' : mode === 'chill' ? '#C8D961' : '#FFFFFF',
            borderWidth: mode === 'chaos' ? '2px' : '0px'
          }}>
            <div className="mb-4">
              <h1 className={`text-xl font-black uppercase tracking-wider ${getTextClass()} mb-1`}>Admin Panel</h1>
            </div>

            {/* User Profile Section */}
            {authUser && (
              <div className={`mb-4 p-2 ${getRoundedClass('rounded-lg')}`}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="[&>button]:bg-transparent [&>button]:border-0 [&>button]:p-0 [&>button]:shadow-none [&>button]:ring-0 [&>button]:ring-offset-0 [&>button]:hover:bg-transparent [&>button]:focus:bg-transparent [&>button]:focus:ring-0">
                    <AccountMenu />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Shield className="w-2.5 h-2.5" />
                      <span className={`text-[10px] font-medium ${getTextClass()}`}>
                        {user ? getRoleDisplayName(user.baseRole) : 'User'}
                      </span>
                    </div>
                    <p className={`text-[10px] ${getTextClass()}/70 truncate`}>
                      {authUser.user_metadata?.full_name || authUser.email || 'User'}
                    </p>
                  </div>
                </div>
                {user?.specialAccess.length > 0 && (
                  <div className="space-y-0.5 mt-1.5">
                    {user.specialAccess.map((access) => (
                      <div key={access} className="flex items-center gap-1.5">
                        <Crown className="w-2.5 h-2.5 text-yellow-500" />
                        <span className={`text-[10px] ${getTextClass()}/70`}>
                          {getSpecialAccessDisplayName(access)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {/* Navigation Sections */}
            <nav className="space-y-3 flex-1">
              {navSections.map((section) => {
                // Check if user has access to this section
                if (section.sectionAccess && !hasSectionAccess(section.sectionAccess)) {
                  return null
                }
                
                const isCollapsed = collapsedSections[section.title] ?? false
                const toggleSection = () => {
                  setCollapsedSections(prev => ({
                    ...prev,
                    [section.title]: !prev[section.title]
                  }))
                }
                
                return (
                  <div key={section.title}>
                    <button
                      onClick={toggleSection}
                      className={`w-full flex items-center justify-between px-2 py-1.5 ${getRoundedClass('rounded-lg')} transition-colors text-[10px] font-bold uppercase tracking-wider ${getTextClass()}/50 hover:${getTextClass()} hover:bg-black/10 mb-1.5`}
                    >
                      <span>{section.title}</span>
                      {isCollapsed ? (
                        <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronUp className="w-3 h-3" />
                      )}
                    </button>
                    {!isCollapsed && (
                      <div className="space-y-0.5">
                        {section.items.map((item) => {
                          // Check section access for individual items
                          if (item.sectionAccess && !hasSectionAccess(item.sectionAccess)) {
                            return null
                          }
                          
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
                              className={`flex items-center gap-2 px-2 py-1.5 ${getRoundedClass('rounded-lg')} transition-colors text-xs ${
                                getNavItemStyle(isActive)
                              }`}
                              style={{
                                borderRadius: mode === 'code' ? '0' : mode === 'chaos' ? '1.5rem' : mode === 'chill' ? '1rem' : '0.5rem'
                              }}
                            >
                              <Icon className="w-3.5 h-3.5" />
                              <span className="font-medium uppercase tracking-wider text-xs">{item.label}</span>
                            </Link>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </nav>

            {/* Bottom Actions */}
            <div className="mt-4 pt-4 border-t space-y-1">
              <Link
                href="/"
                className={`flex items-center gap-2 px-2 py-1.5 ${getRoundedClass('rounded-lg')} ${getTextClass()}/60 hover:${getTextClass()} hover:bg-black/10 transition-colors text-xs`}
              >
                <Home className="w-3.5 h-3.5" />
                <span className="font-medium text-xs">← Back to Dashboard</span>
              </Link>
            </div>
          </Card>

          {/* Right Content Area - 3/4 width */}
          <div className="w-3/4">
            {children}
          </div>
        </div>
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
