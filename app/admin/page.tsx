'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { usePermissions } from '@/contexts/permissions-context'
import { useAuth } from '@/contexts/auth-context'
import { useRouter } from 'next/navigation'
import { 
  User, 
  Lock, 
  Music, 
  FileText, 
  FolderOpen, 
  GitBranch, 
  Video, 
  Crown, 
  HelpCircle, 
  Bell, 
  Users,
  Shield,
  Loader2,
  CheckCircle2,
  ShieldOff
} from 'lucide-react'
import Link from 'next/link'

export default function AdminDashboard() {
  const { permissions } = usePermissions()
  const { user } = useAuth()
  const router = useRouter()
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)

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
      // This would need to be handled via email reset or admin API
      // For now, we'll show a message
      setPasswordError('Password updates for OAuth users must be done through your Google account settings.')
      setPasswordLoading(false)
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password')
      setPasswordLoading(false)
    }
  }

  if (!permissions?.canViewAdmin) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Admin Dashboard</h1>
        </div>
        <Card className="p-6">
          <div className="flex items-center gap-3 text-destructive">
            <ShieldOff className="w-5 h-5" />
            <p>You don't have permission to view the admin dashboard.</p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage your account, content, and site settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Your Details Section */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <User className="w-5 h-5 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">Your Details</h2>
          </div>
          
          <div className="space-y-4">
            {/* Update Password */}
            <div className="border-b pb-4">
              <div className="flex items-center gap-2 mb-3">
                <Lock className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Update Password</Label>
              </div>
              <form onSubmit={handlePasswordUpdate} className="space-y-3">
                <Input
                  type="password"
                  placeholder="Current password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  disabled={passwordLoading}
                />
                <Input
                  type="password"
                  placeholder="New password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  disabled={passwordLoading}
                />
                <Input
                  type="password"
                  placeholder="Confirm new password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  disabled={passwordLoading}
                />
                {passwordError && (
                  <p className="text-sm text-destructive">{passwordError}</p>
                )}
                {passwordSuccess && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Password updated successfully!</span>
                  </div>
                )}
                <Button type="submit" disabled={passwordLoading} size="sm">
                  {passwordLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Password'
                  )}
                </Button>
              </form>
            </div>

            {/* Update Profile */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <User className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Update Profile</Label>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Manage your profile information, photo, and preferences
              </p>
              <Link href="/profile">
                <Button variant="outline" size="sm">
                  Go to Profile
                </Button>
              </Link>
            </div>
          </div>
        </Card>

        {/* Submit Content Section */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <FileText className="w-5 h-5 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">Submit Content</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Music className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Add Music Read</Label>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Submit a music recommendation or reading
              </p>
              <Button variant="outline" size="sm" disabled>
                Coming Soon
              </Button>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Add Work Sample</Label>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Share your work samples and portfolio pieces
              </p>
              <Button variant="outline" size="sm" disabled>
                Coming Soon
              </Button>
            </div>
          </div>
        </Card>

        {/* Content Section */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <FolderOpen className="w-5 h-5 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">Content</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FolderOpen className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Resources</Label>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Manage shared resources and documents
              </p>
              <Link href="/admin/content">
                <Button variant="outline" size="sm">
                  Manage Resources
                </Button>
              </Link>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-3">
                <GitBranch className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Pipeline</Label>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                View and manage work pipeline
              </p>
              <Button variant="outline" size="sm" disabled>
                Coming Soon
              </Button>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Video className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Meeting Recordings</Label>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Access and manage meeting recordings
              </p>
              <Button variant="outline" size="sm" disabled>
                Coming Soon
              </Button>
            </div>
          </div>
        </Card>

        {/* Curation Section */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Crown className="w-5 h-5 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">Curation</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Crown className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Beast Babe</Label>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Pass the Beast Babe torch to the next person
              </p>
              {permissions?.canPassBeastBabe ? (
                <Link href="/admin/beast-babe">
                  <Button variant="outline" size="sm">
                    Manage Beast Babe
                  </Button>
                </Link>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  Permission Required
                </Button>
              )}
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-3">
                <HelpCircle className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Weekly Question</Label>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Create and manage weekly questions
              </p>
              <Button variant="outline" size="sm" disabled>
                Coming Soon
              </Button>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Music className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Playlist</Label>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Manage featured playlists
              </p>
              {permissions?.canManagePlaylists ? (
                <Link href="/admin/playlists">
                  <Button variant="outline" size="sm">
                    Manage Playlists
                  </Button>
                </Link>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  Permission Required
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Admin Section */}
        {permissions?.canManageUsers && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Shield className="w-5 h-5 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">Admin</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Bell className="w-4 h-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">Push Notifications</Label>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Send push notifications to users
                </p>
                <Button variant="outline" size="sm" disabled>
                  Coming Soon
                </Button>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">Set Curator</Label>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Assign curator roles to users
                </p>
                <Link href="/admin/users">
                  <Button variant="outline" size="sm">
                    Manage Users
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
