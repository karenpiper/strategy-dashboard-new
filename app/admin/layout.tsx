'use client'

import { useMode } from '@/contexts/mode-context'
import { PermissionsProvider, usePermissions } from '@/contexts/permissions-context'
import { useAuth } from '@/contexts/auth-context'
import { SiteHeader } from '@/components/site-header'
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
  ChevronUp,
  BarChart3,
  MessageSquare,
  Link as LinkIcon,
  Calendar,
  Megaphone
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useEffect, useState } from 'react'
import { getRoleDisplayName, getSpecialAccessDisplayName, getPermissions, type BaseRole } from '@/lib/permissions'
import { AccountMenu } from '@/components/account-menu'
import { Footer } from '@/components/footer'
import { createClient } from '@/lib/supabase/client'
import { useAdminSimulation } from '@/contexts/admin-simulation-context'

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const { mode } = useMode()
  const pathname = usePathname()
  const router = useRouter()
  const { user: authUser, signOut } = useAuth()
  const { user, permissions, isLoading } = usePermissions()
  const { simulatedRole } = useAdminSimulation()
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({})
  const [isSelectedCurator, setIsSelectedCurator] = useState(false)
  const supabase = createClient()

  // Check if user is the selected curator (active assignment)
  // Skip this check when simulating a role
  useEffect(() => {
    async function checkCuratorStatus() {
      // Don't check curator status when simulating
      if (simulatedRole) {
        setIsSelectedCurator(false)
        return
      }

      if (!authUser?.id) {
        setIsSelectedCurator(false)
        return
      }

      try {
        const today = new Date().toISOString().split('T')[0]
        const { data, error } = await supabase
          .from('curator_assignments')
          .select('curator_profile_id, start_date, end_date')
          .eq('curator_profile_id', authUser.id)
          .lte('start_date', today)
          .gte('end_date', today)
          .eq('skipped', false)
          .limit(1)

        if (error) {
          console.error('Error checking curator status:', error)
          setIsSelectedCurator(false)
          return
        }

        setIsSelectedCurator(data && data.length > 0)
      } catch (error) {
        console.error('Error checking curator status:', error)
        setIsSelectedCurator(false)
      }
    }

    checkCuratorStatus()
  }, [authUser?.id, supabase, simulatedRole])

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

  // Use simulated role if set, otherwise use real user
  const effectiveUser = simulatedRole && simulatedRole !== 'visitor'
    ? { baseRole: simulatedRole, specialAccess: [] }
    : simulatedRole === 'visitor'
    ? null
    : user

  const effectivePermissions = effectiveUser ? getPermissions(effectiveUser) : null

  // Check if user is current beast babe (only if not simulating)
  const isCurrentBeastBabe = simulatedRole ? false : (user?.specialAccess?.includes('beast_babe') || false)

  // Helper function to check if user has access to a section
  const hasSectionAccess = (sectionKey: 'content' | 'leadership' | 'curation' | 'admin'): boolean => {
    // If simulating visitor, no access
    if (simulatedRole === 'visitor') return false
    
    // If simulating a role, use that role
    const role = effectiveUser?.baseRole
    if (!role) return false
    
    // All logged in users can see Content Management
    if (sectionKey === 'content') return true
    
    // Contributors/Leader/Admin can see Leadership and Admin sections
    if (sectionKey === 'leadership' || sectionKey === 'admin') {
      return role === 'contributor' || role === 'leader' || role === 'admin'
    }
    
    // Curation section: check for specific access
    if (sectionKey === 'curation') {
      // Playlist: if user is selected curator (only if not simulating)
      // Beast Babe: if user is current beast babe (only if not simulating)
      // We'll handle this at the item level
      const hasCuratorAccess = simulatedRole ? false : isSelectedCurator
      return hasCuratorAccess || isCurrentBeastBabe || role === 'contributor' || role === 'leader' || role === 'admin'
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
        { href: '/admin/video', label: 'Video', icon: Upload, permission: null, sectionAccess: 'content' as const },
      ]
    },
    {
      title: 'LEADERSHIP',
      sectionAccess: 'leadership' as const,
      items: [
        { href: '/admin/pipeline', label: 'Pipeline', icon: GitBranch, permission: null, sectionAccess: 'leadership' as const },
        { href: '/admin/news', label: 'News', icon: Newspaper, permission: null, sectionAccess: 'leadership' as const },
        { href: '/admin/announcements', label: 'Announcements', icon: Megaphone, permission: null, sectionAccess: 'leadership' as const },
        { href: '/admin/this-week', label: 'This Week Stats', icon: BarChart3, permission: null, sectionAccess: 'leadership' as const },
        { href: '/admin/curator-rotation', label: 'Curator Rotation', icon: RotateCw, permission: null, sectionAccess: 'leadership' as const },
        { href: '/admin/channel-polls', label: 'Channel Polls', icon: MessageSquare, permission: 'canManagePlaylists' as const, sectionAccess: 'leadership' as const },
      ]
    },
    {
      title: 'CURATION',
      sectionAccess: 'curation' as const,
      items: [
        { href: '/admin/playlists', label: 'Playlist', icon: Music, permission: 'canManagePlaylists' as const, sectionAccess: 'curation' as const, requiresCurator: false },
        { href: '/admin/beast-babe', label: 'Beast Babe', icon: Crown, permission: null, sectionAccess: 'curation' as const, requiresBeastBabe: true },
      ]
    },
    {
      title: 'ADMIN',
      sectionAccess: 'admin' as const,
      items: [
        { href: '/admin/quick-links', label: 'Quick Links', icon: LinkIcon, permission: 'canManageUsers' as const, sectionAccess: 'admin' as const },
        { href: '/admin/calendar-events', label: 'Calendar Events', icon: Calendar, permission: null, sectionAccess: 'admin' as const },
        { href: '/admin/snaps', label: 'Manage Snaps', icon: MessageSquare, permission: 'canManageUsers' as const, sectionAccess: 'admin' as const },
        { href: '/admin/analytics', label: 'Analytics', icon: BarChart3, permission: 'canManageUsers' as const, sectionAccess: 'admin' as const },
        { href: '/admin/users', label: 'User Management', icon: Users, permission: 'canManageUsers' as const, sectionAccess: 'admin' as const },
        { href: '/admin/notifications', label: 'Push Notifications', icon: Bell, permission: 'canManageUsers' as const, sectionAccess: 'admin' as const },
        { href: '/admin/test-tools', label: 'Test Tools', icon: Settings, permission: null, sectionAccess: 'admin' as const },
      ]
    }
  ]

  return (
    <div className={`min-h-screen ${getBgClass()} ${getTextClass()} ${mode === 'code' ? 'font-mono' : 'font-[family-name:var(--font-raleway)]'}`}>
      <SiteHeader />

      {/* Main Content Area - Centered */}
      <main className="w-full max-w-[1200px] mx-auto px-6 py-10 pt-24">
        <div className="flex gap-6 w-full">
          {/* Left Sidebar Card - 1/4 width - Fixed height, doesn't scroll */}
          <Card className={`w-1/4 ${mode === 'chaos' ? 'bg-[#1A5D52]' : mode === 'chill' ? 'bg-white' : 'bg-[#1a1a1a]'} ${getRoundedClass('rounded-[2.5rem]')} p-4 flex flex-col sticky top-24 self-start h-fit overflow-hidden`} style={{ 
            borderColor: mode === 'chaos' ? '#00C896' : mode === 'chill' ? '#C8D961' : '#FFFFFF',
            borderWidth: mode === 'chaos' ? '2px' : '0px'
          }}>
            <div className="mb-2">
              <h1 className={`text-xl font-black uppercase tracking-wider ${getTextClass()} mb-1`}>Admin Panel</h1>
            </div>

            {/* User Profile Section */}
            {authUser && (
              <div className={`mb-2 p-2 ${getRoundedClass('rounded-lg')}`}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="[&>button]:bg-transparent [&>button]:border-0 [&>button]:p-0 [&>button]:shadow-none [&>button]:ring-0 [&>button]:ring-offset-0 [&>button]:hover:bg-transparent [&>button]:focus:bg-transparent [&>button]:focus:ring-0">
                    <AccountMenu />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Shield className="w-2.5 h-2.5" />
                      <span className={`text-[10px] font-medium ${getTextClass()}`}>
                        {simulatedRole 
                          ? simulatedRole === 'visitor' 
                            ? 'Visitor' 
                            : getRoleDisplayName(simulatedRole)
                          : user 
                            ? getRoleDisplayName(user.baseRole) 
                            : 'User'}
                      </span>
                    </div>
                    <p className={`text-[10px] ${getTextClass()}/70 truncate`}>
                      {authUser.user_metadata?.full_name || authUser.email || 'User'}
                    </p>
                  </div>
                </div>
                {user && user.specialAccess && user.specialAccess.length > 0 && (
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
            <nav className="space-y-3">
              {navSections.map((section) => {
                // Check if user has access to this section
                if (section.sectionAccess && !hasSectionAccess(section.sectionAccess)) {
                  return null
                }
                
                // For Curation section, check if user has access to any items
                if (section.sectionAccess === 'curation') {
                  const hasAccessibleItems = section.items.some((item) => {
                    // Check section access
                    if (item.sectionAccess && !hasSectionAccess(item.sectionAccess)) {
                      return false
                    }
                    // Check permissions (use effective permissions when simulating)
                    // For playlists, only allow: admin, leader, OR current selected curator
                    if (item.permission) {
                      const isPlaylistItem = item.href === '/admin/playlists'
                      if (isPlaylistItem) {
                        // For playlist: check if user is admin/leader OR is current selected curator
                        const role = effectiveUser?.baseRole
                        const hasPermission = effectivePermissions?.[item.permission]
                        // Allow if: admin/leader role OR has canManagePlaylists permission OR is current curator
                        const isAdminOrLeader = role === 'admin' || role === 'leader'
                        const isCurrentCurator = !simulatedRole && isSelectedCurator
                        if (!isAdminOrLeader && !hasPermission && !isCurrentCurator) {
                          return false
                        }
                      } else {
                        // For other items, use normal permission check
                        const hasPermission = effectivePermissions?.[item.permission]
                        if (!hasPermission) {
                          return false
                        }
                      }
                    }
                    // Check curator requirement (only if not simulating)
                    if ((item as any).requiresCurator && (simulatedRole || !isSelectedCurator)) {
                      return false
                    }
                    // Check beast babe requirement (only if not simulating)
                    // Allow admins to see Beast Babe tab
                    if ((item as any).requiresBeastBabe) {
                      const role = effectiveUser?.baseRole
                      const isAdmin = role === 'admin'
                      const hasBeastBabeAccess = !simulatedRole && isCurrentBeastBabe
                      if (!isAdmin && !hasBeastBabeAccess) {
                        return false
                      }
                    }
                    return true
                  })
                  
                  if (!hasAccessibleItems) {
                    return null
                  }
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
                          
                          // Check permissions if required (use effective permissions when simulating)
                          // For playlists, only allow: admin, leader, OR current selected curator
                          if (item.permission) {
                            const isPlaylistItem = item.href === '/admin/playlists'
                            if (isPlaylistItem) {
                              // For playlist: check if user is admin/leader OR is current selected curator
                              const role = effectiveUser?.baseRole
                              const hasPermission = effectivePermissions?.[item.permission]
                              // Allow if: admin/leader role OR has canManagePlaylists permission OR is current curator
                              const isAdminOrLeader = role === 'admin' || role === 'leader'
                              const isCurrentCurator = !simulatedRole && isSelectedCurator
                              if (!isAdminOrLeader && !hasPermission && !isCurrentCurator) {
                                return null
                              }
                            } else {
                              // For other items, use normal permission check
                              const hasPermission = effectivePermissions?.[item.permission]
                              if (!hasPermission) {
                                return null
                              }
                            }
                          }
                          
                          // Check if item requires curator status (only if not simulating)
                          if ((item as any).requiresCurator && (simulatedRole || !isSelectedCurator)) {
                            return null
                          }
                          
                          // Check if item requires beast babe status (only if not simulating)
                          // Allow admins to see Beast Babe tab
                          if ((item as any).requiresBeastBabe) {
                            const role = effectiveUser?.baseRole
                            const isAdmin = role === 'admin'
                            const hasBeastBabeAccess = !simulatedRole && isCurrentBeastBabe
                            if (!isAdmin && !hasBeastBabeAccess) {
                              return null
                            }
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

        <Footer />
      </main>
    </div>
  )
}

import { AdminSimulationProvider } from '@/contexts/admin-simulation-context'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <PermissionsProvider>
      <AdminSimulationProvider>
        <AdminLayoutContent>{children}</AdminLayoutContent>
      </AdminSimulationProvider>
    </PermissionsProvider>
  )
}
