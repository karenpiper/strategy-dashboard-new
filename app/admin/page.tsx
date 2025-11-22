'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { usePermissions } from '@/contexts/permissions-context'
import { useAuth } from '@/contexts/auth-context'
import { useMode } from '@/contexts/mode-context'
import { useRouter } from 'next/navigation'
import { 
  User, 
  Lock, 
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
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'

export default function AdminDashboard() {
  const { permissions, user: permissionsUser } = usePermissions()
  const { user } = useAuth()
  const { mode } = useMode()
  const router = useRouter()
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)

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

  const getCardStyle = (color: 'purple' | 'green' | 'orange' | 'pink') => {
    if (mode === 'chaos') {
      const colors = {
        purple: { bg: 'bg-[#9D4EFF]/20', border: 'border-[#9D4EFF]/40', text: 'text-white', accent: '#9D4EFF' },
        green: { bg: 'bg-[#C4F500]/20', border: 'border-[#C4F500]/40', text: 'text-white', accent: '#C4F500' },
        orange: { bg: 'bg-[#FF6B35]/20', border: 'border-[#FF6B35]/40', text: 'text-white', accent: '#FF6B35' },
        pink: { bg: 'bg-[#FF4081]/20', border: 'border-[#FF4081]/40', text: 'text-white', accent: '#FF4081' },
      }
      return colors[color]
    } else if (mode === 'chill') {
      const colors = {
        purple: { bg: 'bg-[#C8D961]/20', border: 'border-[#C8D961]/40', text: 'text-[#4A1818]', accent: '#C8D961' },
        green: { bg: 'bg-[#FFC043]/20', border: 'border-[#FFC043]/40', text: 'text-[#4A1818]', accent: '#FFC043' },
        orange: { bg: 'bg-[#FF6B35]/20', border: 'border-[#FF6B35]/40', text: 'text-[#4A1818]', accent: '#FF6B35' },
        pink: { bg: 'bg-[#FFB5D8]/20', border: 'border-[#FFB5D8]/40', text: 'text-[#4A1818]', accent: '#FFB5D8' },
      }
      return colors[color]
    } else { // code
      const colors = {
        purple: { bg: 'bg-black', border: 'border-[#FFFFFF]', text: 'text-[#FFFFFF]', accent: '#FFFFFF' },
        green: { bg: 'bg-black', border: 'border-[#FFFFFF]', text: 'text-[#FFFFFF]', accent: '#FFFFFF' },
        orange: { bg: 'bg-black', border: 'border-[#FFFFFF]', text: 'text-[#FFFFFF]', accent: '#FFFFFF' },
        pink: { bg: 'bg-black', border: 'border-[#FFFFFF]', text: 'text-[#FFFFFF]', accent: '#FFFFFF' },
      }
      return colors[color]
    }
  }

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError(null)
    setPasswordSuccess(false)
    setPasswordLoading(true)

    try {
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        setPasswordError('New passwords do not match')
        setPasswordLoading(false)
        return
      }

      if (passwordData.newPassword.length < 6) {
        setPasswordError('Password must be at least 6 characters')
        setPasswordLoading(false)
        return
      }

      // Note: Supabase doesn't support password updates from client-side for OAuth users
      setPasswordError('Password updates for OAuth users must be done through your Google account settings.')
      setPasswordLoading(false)
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password')
      setPasswordLoading(false)
    }
  }

  const roleDisplay = permissionsUser?.baseRole ? `${permissionsUser.baseRole.charAt(0).toUpperCase() + permissionsUser.baseRole.slice(1)}` : 'User'
  const accessLevel = permissions?.canManageUsers ? 'admin' : permissions?.canViewAdmin ? 'contributor' : 'user'

  return (
    <div className={getBgClass()}>
      {/* Header */}
      <div className="mb-8">
        <h1 className={`text-4xl font-bold ${getTextClass()} mb-2`}>Welcome to the Admin Panel</h1>
        <p className={`${getTextClass()}/70`}>You have {accessLevel} level access.</p>
        <p className={`text-sm ${getTextClass()}/50 mt-2`}>
          Use the sidebar to navigate to different sections based on your permissions.
        </p>
      </div>

      {/* Getting Started Guide */}
      <div className="mb-8">
        <h2 className={`text-2xl font-bold ${getTextClass()} mb-2`}>Getting Started Guide</h2>
        <p className={`${getTextClass()}/70 mb-6`}>
          New to the admin panel? Here's how to get started and make the most of your dashboard.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* PROFILE MANAGEMENT */}
          <Card className={`${getCardStyle('purple').bg} ${getCardStyle('purple').border} border-2 p-6 ${getRoundedClass('rounded-xl')}`}>
            <h3 className={`text-xl font-bold ${getCardStyle('purple').text} mb-4`}>PROFILE MANAGEMENT</h3>
            <ul className={`space-y-3 ${getCardStyle('purple').text}/90`}>
              <li className="flex items-start gap-2">
                <Lock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <strong>Update Password:</strong> Change your login credentials for security.
                </div>
              </li>
              <li className="flex items-start gap-2">
                <User className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <strong>Update Profile:</strong> Update your photo, birthday, and profile information.
                </div>
              </li>
              <li className="flex items-start gap-2">
                <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <strong>View Permissions:</strong> See your current access level and capabilities.
                </div>
              </li>
            </ul>
          </Card>

          {/* PUBLISH CONTENT */}
          <Card className={`${getCardStyle('green').bg} ${getCardStyle('green').border} border-2 p-6 ${getRoundedClass('rounded-xl')}`}>
            <h3 className={`text-xl font-bold ${getCardStyle('green').text} mb-4`}>PUBLISH CONTENT</h3>
            <ul className={`space-y-3 ${getCardStyle('green').text}/90`}>
              <li className="flex items-start gap-2">
                <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <strong>Must Reads:</strong> Share articles, resources, and important content.
                </div>
              </li>
              <li className="flex items-start gap-2">
                <Newspaper className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <strong>News:</strong> Post team announcements and updates.
                </div>
              </li>
              <li className="flex items-start gap-2">
                <Briefcase className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <strong>Work Samples:</strong> Showcase completed projects and achievements.
                </div>
              </li>
              <li className="flex items-start gap-2">
                <FolderOpen className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <strong>Team Resources:</strong> Upload documents, guides, and shared materials.
                </div>
              </li>
            </ul>
          </Card>

          {/* CONTENT MANAGEMENT */}
          <Card className={`${getCardStyle('orange').bg} ${getCardStyle('orange').border} border-2 p-6 ${getRoundedClass('rounded-xl')}`}>
            <h3 className={`text-xl font-bold ${getCardStyle('orange').text} mb-4`}>CONTENT MANAGEMENT</h3>
            <ul className={`space-y-3 ${getCardStyle('orange').text}/90`}>
              <li className="flex items-start gap-2">
                <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <strong>Edit & Update:</strong> Modify existing content you've created or been assigned.
                </div>
              </li>
              <li className="flex items-start gap-2">
                <FolderOpen className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <strong>View & Organize:</strong> Browse and organize team resources and pipeline items.
                </div>
              </li>
              <li className="flex items-start gap-2">
                <GitBranch className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <strong>Manage Pipeline:</strong> Track and update new business opportunities.
                </div>
              </li>
              <li className="flex items-start gap-2">
                <Video className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <strong>Meeting Recordings:</strong> Access and manage team meeting recordings.
                </div>
              </li>
            </ul>
          </Card>

          {/* ADMIN FUNCTIONS */}
          {permissions?.canManageUsers && (
            <Card className={`${getCardStyle('pink').bg} ${getCardStyle('pink').border} border-2 p-6 ${getRoundedClass('rounded-xl')}`}>
              <h3 className={`text-xl font-bold ${getCardStyle('pink').text} mb-4`}>ADMIN FUNCTIONS</h3>
              <ul className={`space-y-3 ${getCardStyle('pink').text}/90`}>
                <li className="flex items-start gap-2">
                  <Bell className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Push Notifications:</strong> Send important announcements and updates to the team.
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <Users className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Curator Management:</strong> Assign and manage weekly curator responsibilities.
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <Crown className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Beast Babe Selection:</strong> Choose and recognize outstanding team members.
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>System Monitoring:</strong> Monitor dashboard performance and team activity.
                  </div>
                </li>
              </ul>
            </Card>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className={`text-2xl font-bold ${getTextClass()} mb-4`}>Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/admin/password">
            <Button 
              className={`${getRoundedClass('rounded-lg')} ${
                mode === 'chaos' ? 'bg-[#C4F500] text-black hover:bg-[#C4F500]/80' :
                mode === 'chill' ? 'bg-[#FFC043] text-[#4A1818] hover:bg-[#FFC043]/80' :
                'bg-[#FFFFFF] text-black hover:bg-[#FFFFFF]/80'
              }`}
            >
              <Lock className="w-4 h-4 mr-2" />
              Update Password
            </Button>
          </Link>
          <Link href="/profile">
            <Button 
              className={`${getRoundedClass('rounded-lg')} ${
                mode === 'chaos' ? 'bg-[#C4F500] text-black hover:bg-[#C4F500]/80' :
                mode === 'chill' ? 'bg-[#FFC043] text-[#4A1818] hover:bg-[#FFC043]/80' :
                'bg-[#FFFFFF] text-black hover:bg-[#FFFFFF]/80'
              }`}
            >
              <User className="w-4 h-4 mr-2" />
              Update Profile
            </Button>
          </Link>
          <Link href="/admin/must-read">
            <Button 
              className={`${getRoundedClass('rounded-lg')} ${
                mode === 'chaos' ? 'bg-[#C4F500] text-black hover:bg-[#C4F500]/80' :
                mode === 'chill' ? 'bg-[#FFC043] text-[#4A1818] hover:bg-[#FFC043]/80' :
                'bg-[#FFFFFF] text-black hover:bg-[#FFFFFF]/80'
              }`}
            >
              <FileText className="w-4 h-4 mr-2" />
              Add a Must Read
            </Button>
          </Link>
        </div>
      </div>

      {/* Need Help Section */}
      <Card className={`${mode === 'chaos' ? 'bg-red-500/20 border-red-500/40' : mode === 'chill' ? 'bg-red-500/10 border-red-500/30' : 'bg-red-500/20 border-red-500/40'} border-2 p-6 ${getRoundedClass('rounded-xl')}`}>
        <div className="flex items-start gap-3">
          <AlertCircle className={`w-6 h-6 ${mode === 'chaos' ? 'text-red-400' : mode === 'chill' ? 'text-red-600' : 'text-red-500'} flex-shrink-0`} />
          <div>
            <h3 className={`text-xl font-bold ${getTextClass()} mb-2`}>Need Help?</h3>
            <p className={`${getTextClass()}/70 mb-3`}>
              If you're having trouble or need assistance with any feature:
            </p>
            <ul className={`space-y-1 ${getTextClass()}/70 text-sm`}>
              <li>• Use the sidebar navigation to explore different sections.</li>
              <li>• Contact Karen for technical support.</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  )
}
