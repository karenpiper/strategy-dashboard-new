'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { usePermissions } from '@/contexts/permissions-context'
import { useAuth } from '@/contexts/auth-context'
import { useMode } from '@/contexts/mode-context'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getPermissions, type BaseRole, type UserPermissions } from '@/lib/permissions'
import { 
  FileText, 
  Newspaper, 
  Briefcase, 
  FolderOpen, 
  GitBranch, 
  Video, 
  Crown, 
  HelpCircle, 
  Music, 
  Bell, 
  Users, 
  RotateCw,
  Shield,
  AlertCircle,
  MessageSquare,
  Loader2,
  Eye
} from 'lucide-react'
import Link from 'next/link'

export default function AdminDashboard() {
  const { permissions: realPermissions, user: permissionsUser } = usePermissions()
  const { user } = useAuth()
  const { mode } = useMode()
  const router = useRouter()
  const supabase = createClient()
  const [testingSlack, setTestingSlack] = useState(false)
  const [simulatedRole, setSimulatedRole] = useState<BaseRole | 'visitor' | null>(null)
  
  // Use simulated role if set, otherwise use real permissions
  const effectivePermissions = simulatedRole && simulatedRole !== 'visitor'
    ? getPermissions({ baseRole: simulatedRole, specialAccess: [] })
    : simulatedRole === 'visitor'
    ? null
    : realPermissions

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

  const getCardStyle = () => {
    if (mode === 'chaos') {
      return { 
        bg: 'bg-[#000000]', 
        border: 'border border-[#C4F500]', 
        text: 'text-white', 
        accent: '#C4F500' 
      }
    } else if (mode === 'chill') {
      return { 
        bg: 'bg-white', 
        border: 'border border-[#FFC043]/30', 
        text: 'text-[#4A1818]', 
        accent: '#FFC043' 
      }
    } else { // code
      return { 
        bg: 'bg-[#000000]', 
        border: 'border border-[#FFFFFF]', 
        text: 'text-[#FFFFFF]', 
        accent: '#FFFFFF' 
      }
    }
  }


  const roleDisplay = simulatedRole 
    ? simulatedRole === 'visitor' 
      ? 'Visitor' 
      : `${simulatedRole.charAt(0).toUpperCase() + simulatedRole.slice(1)}`
    : permissionsUser?.baseRole && typeof permissionsUser.baseRole === 'string' && permissionsUser.baseRole.length > 0
    ? `${permissionsUser.baseRole.charAt(0).toUpperCase() + permissionsUser.baseRole.slice(1)}`
    : 'User'
  const accessLevel = effectivePermissions?.canManageUsers ? 'admin' : effectivePermissions?.canViewAdmin ? 'contributor' : simulatedRole === 'visitor' ? 'visitor' : 'user'

  const handleTestSlack = async () => {
    if (!user) {
      alert('You must be logged in to test Slack notifications')
      return
    }

    setTestingSlack(true)
    try {
      // Get current user's profile with slack_id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('slack_id, full_name')
        .eq('id', user.id)
        .single()

      if (profileError || !profile) {
        alert('Error fetching your profile')
        return
      }

      if (!profile.slack_id) {
        alert('Your profile does not have a Slack ID. Please add it in User Management.')
        return
      }

      // Calculate test dates (3 days from now, 7 day period)
      const assignmentDate = new Date()
      const startDate = new Date(assignmentDate)
      startDate.setDate(startDate.getDate() + 3)
      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + 7)

      const baseUrl = window.location.origin
      const testCurationUrl = `${baseUrl}/curate?assignment=test-${Date.now()}`

      const response = await fetch('/api/slack/notify-curator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slack_id: profile.slack_id,
          curator_name: profile.full_name || 'Test User',
          curation_url: testCurationUrl,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0]
        })
      })

      const data = await response.json()
      if (response.ok) {
        alert('✅ Slack DM sent successfully! Check your Slack DMs.')
      } else {
        alert(`❌ Error: ${data.error || data.message || 'Failed to send Slack DM'}\n\n${data.details ? `Details: ${data.details}` : ''}`)
      }
    } catch (error: any) {
      console.error('Error testing Slack:', error)
      alert(`❌ Error: ${error.message || 'Failed to test Slack notification'}`)
    } finally {
      setTestingSlack(false)
    }
  }

  return (
    <div className={`${getBgClass()} ${mode === 'code' ? 'font-mono' : 'font-[family-name:var(--font-raleway)]'}`}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className={`text-4xl font-black uppercase ${getTextClass()} mb-2`}>Welcome to the Admin Panel</h1>
            <p className={`${getTextClass()}/70 font-normal`}>You have {accessLevel} level access.</p>
            <p className={`text-sm ${getTextClass()}/50 mt-2 font-medium`}>
              Use the sidebar to navigate to different sections based on your permissions.
            </p>
          </div>
          
          {/* Role Simulation Dropdown - Admin Only */}
          {realPermissions?.canManageUsers && (
            <div className="flex items-center gap-3">
              <Eye className={`w-5 h-5 ${getTextClass()}/70`} />
              <div className="flex flex-col gap-1">
                <label className={`text-xs font-semibold uppercase tracking-wider ${getTextClass()}/70`}>
                  View As:
                </label>
                <select
                  value={simulatedRole || 'actual'}
                  onChange={(e) => {
                    const value = e.target.value
                    setSimulatedRole(value === 'actual' ? null : (value as BaseRole | 'visitor'))
                  }}
                  className={`${getRoundedClass('rounded-lg')} px-3 py-2 text-sm font-medium ${
                    mode === 'chaos' 
                      ? 'bg-[#2A2A2A] text-white border border-[#00C896]/30' 
                      : mode === 'chill'
                      ? 'bg-white text-[#4A1818] border border-[#FFC043]/30'
                      : 'bg-[#1a1a1a] text-white border border-white/30'
                  } focus:outline-none focus:ring-2 ${
                    mode === 'chaos' 
                      ? 'focus:ring-[#00C896]' 
                      : mode === 'chill'
                      ? 'focus:ring-[#FFC043]'
                      : 'focus:ring-white'
                  }`}
                >
                  <option value="actual">Actual Role ({permissionsUser?.baseRole || 'user'})</option>
                  <option value="visitor">Visitor</option>
                  <option value="user">User</option>
                  <option value="contributor">Contributor</option>
                  <option value="leader">Leader</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
          )}
        </div>
        
        {simulatedRole && (
          <div className={`${getRoundedClass('rounded-lg')} px-4 py-2 mb-4 ${
            mode === 'chaos' 
              ? 'bg-[#00C896]/20 border border-[#00C896]/40' 
              : mode === 'chill'
              ? 'bg-[#FFC043]/20 border border-[#FFC043]/40'
              : 'bg-white/20 border border-white/40'
          }`}>
            <p className={`text-sm font-medium ${getTextClass()}`}>
              <Eye className="w-4 h-4 inline mr-2" />
              Simulating view as: <strong>{roleDisplay}</strong>
            </p>
          </div>
        )}
      </div>

      {/* Getting Started Guide */}
      <div className="mb-8">
        <h2 className={`text-2xl font-black uppercase tracking-wider ${getTextClass()} mb-2`}>Getting Started Guide</h2>
        <p className={`${getTextClass()}/70 mb-6 font-normal`}>
          New to the admin panel? Here's how to get started and make the most of your dashboard.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* PUBLISH CONTENT */}
          <Card className={`${getCardStyle().bg} ${getCardStyle().border} border p-6 ${getRoundedClass('rounded-xl')}`}>
            <h3 className={`text-xl font-black uppercase tracking-wider ${getCardStyle().text} mb-4`}>PUBLISH CONTENT</h3>
            <ul className={`space-y-3 ${getCardStyle().text}/90`}>
              <li className="flex items-start gap-2">
                <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div className="font-normal">
                  <strong className="font-semibold">Must Reads:</strong> Share articles, resources, and important content.
                </div>
              </li>
              <li className="flex items-start gap-2">
                <Newspaper className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div className="font-normal">
                  <strong className="font-semibold">News:</strong> Post team announcements and updates.
                </div>
              </li>
              <li className="flex items-start gap-2">
                <Briefcase className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div className="font-normal">
                  <strong className="font-semibold">Work Samples:</strong> Showcase completed projects and achievements.
                </div>
              </li>
              <li className="flex items-start gap-2">
                <FolderOpen className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div className="font-normal">
                  <strong className="font-semibold">Team Resources:</strong> Upload documents, guides, and shared materials.
                </div>
              </li>
            </ul>
          </Card>

          {/* CONTENT MANAGEMENT */}
          <Card className={`${getCardStyle().bg} ${getCardStyle().border} border p-6 ${getRoundedClass('rounded-xl')}`}>
            <h3 className={`text-xl font-black uppercase tracking-wider ${getCardStyle().text} mb-4`}>CONTENT MANAGEMENT</h3>
            <ul className={`space-y-3 ${getCardStyle().text}/90`}>
              <li className="flex items-start gap-2">
                <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div className="font-normal">
                  <strong className="font-semibold">Edit & Update:</strong> Modify existing content you've created or been assigned.
                </div>
              </li>
              <li className="flex items-start gap-2">
                <FolderOpen className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div className="font-normal">
                  <strong className="font-semibold">View & Organize:</strong> Browse and organize team resources and pipeline items.
                </div>
              </li>
              <li className="flex items-start gap-2">
                <GitBranch className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div className="font-normal">
                  <strong className="font-semibold">Manage Pipeline:</strong> Track and update new business opportunities.
                </div>
              </li>
              <li className="flex items-start gap-2">
                <Video className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div className="font-normal">
                  <strong className="font-semibold">Meeting Recordings:</strong> Access and manage team meeting recordings.
                </div>
              </li>
            </ul>
          </Card>

          {/* ADMIN FUNCTIONS */}
          {effectivePermissions?.canManageUsers && (
            <Card className={`${getCardStyle().bg} ${getCardStyle().border} border p-6 ${getRoundedClass('rounded-xl')}`}>
              <h3 className={`text-xl font-black uppercase tracking-wider ${getCardStyle().text} mb-4`}>ADMIN FUNCTIONS</h3>
              <ul className={`space-y-3 ${getCardStyle().text}/90`}>
                <li className="flex items-start gap-2">
                  <Bell className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div className="font-normal">
                    <strong className="font-semibold">Push Notifications:</strong> Send important announcements and updates to the team.
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <Users className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div className="font-normal">
                    <strong className="font-semibold">Curator Management:</strong> Assign and manage weekly curator responsibilities.
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <Crown className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div className="font-normal">
                    <strong className="font-semibold">Beast Babe Selection:</strong> Choose and recognize outstanding team members.
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div className="font-normal">
                    <strong className="font-semibold">System Monitoring:</strong> Monitor dashboard performance and team activity.
                  </div>
                </li>
              </ul>
            </Card>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className={`text-2xl font-black uppercase tracking-wider ${getTextClass()} mb-4`}>Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/admin/must-read">
            <Button 
              className={`${getRoundedClass('rounded-lg')} ${
                mode === 'chaos' ? 'bg-[#C4F500] text-black hover:bg-[#C4F500]/80' :
                mode === 'chill' ? 'bg-[#FFC043] text-[#4A1818] hover:bg-[#FFC043]/80' :
                'bg-[#FFFFFF] text-black hover:bg-[#FFFFFF]/80'
              } font-black uppercase tracking-wider ${mode === 'code' ? 'font-mono' : ''}`}
            >
              <FileText className="w-4 h-4 mr-2" />
              Add a Must Read
            </Button>
          </Link>
        </div>
      </div>

      {/* Testing Tools - Admin Only */}
      {effectivePermissions?.canManageUsers && (
        <div className="mb-8">
          <h2 className={`text-2xl font-black uppercase tracking-wider ${getTextClass()} mb-4`}>Testing Tools</h2>
          <Card className={`${getCardStyle().bg} ${getCardStyle().border} border p-6 ${getRoundedClass('rounded-xl')}`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className={`text-lg font-black uppercase ${getCardStyle().text} mb-2`}>Test Slack DM</h3>
                <p className={`${getCardStyle().text}/70 text-sm mb-4`}>
                  Send a test Slack DM to yourself to verify the Slack integration is working.
                </p>
              </div>
              <Button
                onClick={handleTestSlack}
                disabled={testingSlack}
                className={`${getRoundedClass('rounded-lg')} ${
                  mode === 'chaos' ? 'bg-[#C4F500] text-black hover:bg-[#C4F500]/80' :
                  mode === 'chill' ? 'bg-[#FFC043] text-[#4A1818] hover:bg-[#FFC043]/80' :
                  'bg-[#FFFFFF] text-black hover:bg-[#FFFFFF]/80'
                } font-black uppercase tracking-wider ${mode === 'code' ? 'font-mono' : ''}`}
              >
                {testingSlack ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Test Slack DM
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Need Help Section */}
      <Card className={`${getCardStyle().bg} ${getCardStyle().border} border p-6 ${getRoundedClass('rounded-xl')}`}>
        <div className="flex items-start gap-3">
          <AlertCircle className={`w-6 h-6`} style={{ color: getCardStyle().accent }} />
          <div>
            <h3 className={`text-xl font-black uppercase tracking-wider ${getCardStyle().text} mb-2`}>Need Help?</h3>
            <p className={`${getCardStyle().text}/70 mb-3`}>
              If you're having trouble or need assistance with any feature:
            </p>
            <ul className={`space-y-1 ${getCardStyle().text}/70 text-sm`}>
              <li>• Use the sidebar navigation to explore different sections.</li>
              <li>• Contact Karen for technical support.</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  )
}
