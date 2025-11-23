'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useMode } from '@/contexts/mode-context'
import { usePermissions } from '@/contexts/permissions-context'
import { Users, Search, Save, Loader2, User, Mail, Calendar, Briefcase, Building, Globe, MapPin, Image as ImageIcon } from 'lucide-react'

interface UserProfile {
  id: string
  email: string | null
  full_name: string | null
  avatar_url: string | null
  birthday: string | null
  discipline: string | null
  role: string | null
  base_role: string
  special_access: string[] | null
  start_date: string | null
  bio: string | null
  location: string | null
  website: string | null
  pronouns: string | null
  created_at: string
  updated_at: string
}

export default function UsersAdminPage() {
  const { mode } = useMode()
  const { permissions } = usePermissions()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null)
  const [saving, setSaving] = useState(false)

  const getBorderColor = () => {
    switch (mode) {
      case 'chaos':
        return '#C4F500'
      case 'chill':
        return '#FFC043'
      case 'code':
        return '#FFFFFF'
      default:
        return '#00FF87'
    }
  }

  const getTextClass = () => {
    switch (mode) {
      case 'chaos':
        return 'text-[#C4F500]'
      case 'chill':
        return 'text-[#FFC043]'
      case 'code':
        return 'text-[#FFFFFF] font-mono'
      default:
        return 'text-white'
    }
  }

  const getRoundedClass = (defaultClass: string) => {
    return mode === 'code' ? 'rounded-none' : defaultClass
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/profiles')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch users')
      }

      const result = await response.json()
      setUsers(result.data || [])
    } catch (err: any) {
      console.error('Error fetching users:', err)
      setError(err.message || 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const handleUserSelect = (user: UserProfile) => {
    setSelectedUser(user)
    setEditingUser({ ...user })
  }

  const handleSave = async () => {
    if (!editingUser) return

    try {
      setSaving(true)
      setError(null)

      const response = await fetch('/api/profiles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingUser),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update user')
      }

      const result = await response.json()
      
      // Update local state
      setUsers(prev => prev.map(u => u.id === editingUser.id ? result.data : u))
      setSelectedUser(result.data)
      setEditingUser(result.data)
      
      alert('User profile updated successfully!')
    } catch (err: any) {
      console.error('Error updating user:', err)
      setError(err.message || 'Failed to update user')
      alert('Failed to update user: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const filteredUsers = users.filter(user => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return (
      user.full_name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.discipline?.toLowerCase().includes(query) ||
      user.role?.toLowerCase().includes(query)
    )
  })

  if (!permissions?.canManageUsers) {
    return (
      <div className="container mx-auto p-6">
        <Card className="p-6">
          <p className="text-destructive">You don't have permission to manage users.</p>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: getBorderColor() }} />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="size-6" style={{ color: getBorderColor() }} />
          <h1 className={`text-3xl font-bold ${getTextClass()}`}>
            USER MANAGER
          </h1>
        </div>
      </div>

      {error && (
        <Card className="p-4 border-2" style={{ borderColor: '#ef4444', backgroundColor: mode === 'chill' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.1)' }}>
          <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User List */}
        <Card
          className="flex flex-col h-[calc(100vh-12rem)]"
          style={{
            backgroundColor: '#ffffff',
            borderColor: getBorderColor(),
            borderWidth: '2px',
          }}
        >
          <div className="p-4 border-b" style={{ borderColor: `${getBorderColor()}40` }}>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-black opacity-40" />
              <Input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white text-black border-gray-300"
              />
            </div>
            <h2 className="text-lg font-semibold text-black">
              Users ({filteredUsers.length})
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                onClick={() => handleUserSelect(user)}
                className={`p-3 ${getRoundedClass('rounded-lg')} cursor-pointer transition-all ${
                  selectedUser?.id === user.id
                    ? 'bg-gray-100 border-2'
                    : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                }`}
                style={{
                  borderColor: selectedUser?.id === user.id ? getBorderColor() : undefined,
                }}
              >
                <div className="flex items-center gap-3">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.full_name || 'User'}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                      <User className="w-5 h-5 text-gray-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-black truncate">
                      {user.full_name || user.email || 'Unnamed User'}
                    </p>
                    {user.role && (
                      <p className="text-xs text-gray-600 truncate">{user.role}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Edit Form */}
        {editingUser && (
          <Card
            className="lg:col-span-2 flex flex-col h-[calc(100vh-12rem)]"
            style={{
              backgroundColor: '#ffffff',
              borderColor: getBorderColor(),
              borderWidth: '2px',
            }}
          >
            <div className="p-6 border-b overflow-y-auto flex-1" style={{ borderColor: `${getBorderColor()}40` }}>
              <h2 className="text-xl font-semibold text-black mb-6">Edit User Profile</h2>
              
              <div className="space-y-6">
                {/* Avatar URL */}
                <div>
                  <Label className="text-black flex items-center gap-2 mb-2">
                    <ImageIcon className="w-4 h-4" />
                    Avatar URL
                  </Label>
                  <Input
                    value={editingUser.avatar_url || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, avatar_url: e.target.value })}
                    placeholder="https://..."
                    className="bg-white text-black border-gray-300"
                  />
                  {editingUser.avatar_url && (
                    <div className="mt-2">
                      <img
                        src={editingUser.avatar_url}
                        alt="Avatar preview"
                        className="w-20 h-20 rounded-full object-cover border-2"
                        style={{ borderColor: getBorderColor() }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-black flex items-center gap-2 mb-2">
                      <User className="w-4 h-4" />
                      Full Name
                    </Label>
                    <Input
                      value={editingUser.full_name || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })}
                      placeholder="Full Name"
                      className="bg-white text-black border-gray-300"
                    />
                  </div>
                  <div>
                    <Label className="text-black flex items-center gap-2 mb-2">
                      <Mail className="w-4 h-4" />
                      Email
                    </Label>
                    <Input
                      value={editingUser.email || ''}
                      disabled
                      className="bg-gray-100 text-gray-600 border-gray-300"
                    />
                    <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                  </div>
                </div>

                {/* Birthday and Start Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-black flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4" />
                      Birthday (MM/DD)
                    </Label>
                    <Input
                      value={editingUser.birthday || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, birthday: e.target.value })}
                      placeholder="03/15"
                      className="bg-white text-black border-gray-300"
                    />
                  </div>
                  <div>
                    <Label className="text-black flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4" />
                      Start Date
                    </Label>
                    <Input
                      type="date"
                      value={editingUser.start_date || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, start_date: e.target.value })}
                      className="bg-white text-black border-gray-300"
                    />
                  </div>
                </div>

                {/* Department and Title */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-black flex items-center gap-2 mb-2">
                      <Building className="w-4 h-4" />
                      Department (Discipline)
                    </Label>
                    <Input
                      value={editingUser.discipline || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, discipline: e.target.value })}
                      placeholder="e.g., Design, Engineering"
                      className="bg-white text-black border-gray-300"
                    />
                  </div>
                  <div>
                    <Label className="text-black flex items-center gap-2 mb-2">
                      <Briefcase className="w-4 h-4" />
                      Title (Role)
                    </Label>
                    <Input
                      value={editingUser.role || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                      placeholder="e.g., Creative Director"
                      className="bg-white text-black border-gray-300"
                    />
                  </div>
                </div>

                {/* Base Role */}
                <div>
                  <Label className="text-black flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4" />
                    Base Role
                  </Label>
                  <select
                    value={editingUser.base_role || 'user'}
                    onChange={(e) => setEditingUser({ ...editingUser, base_role: e.target.value })}
                    className="w-full h-9 rounded-md border border-gray-300 bg-white text-black px-3"
                  >
                    <option value="user">User</option>
                    <option value="contributor">Contributor</option>
                    <option value="leader">Leader</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                {/* Pronouns */}
                <div>
                  <Label className="text-black mb-2">Pronouns</Label>
                  <Input
                    value={editingUser.pronouns || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, pronouns: e.target.value })}
                    placeholder="e.g., they/them, she/her"
                    className="bg-white text-black border-gray-300"
                  />
                </div>

                {/* Location and Website */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-black flex items-center gap-2 mb-2">
                      <MapPin className="w-4 h-4" />
                      Location
                    </Label>
                    <Input
                      value={editingUser.location || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, location: e.target.value })}
                      placeholder="City, State"
                      className="bg-white text-black border-gray-300"
                    />
                  </div>
                  <div>
                    <Label className="text-black flex items-center gap-2 mb-2">
                      <Globe className="w-4 h-4" />
                      Website
                    </Label>
                    <Input
                      value={editingUser.website || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, website: e.target.value })}
                      placeholder="https://..."
                      className="bg-white text-black border-gray-300"
                    />
                  </div>
                </div>

                {/* Bio */}
                <div>
                  <Label className="text-black mb-2">Bio</Label>
                  <Textarea
                    value={editingUser.bio || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, bio: e.target.value })}
                    placeholder="User bio..."
                    rows={4}
                    className="bg-white text-black border-gray-300"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t flex justify-end gap-2" style={{ borderColor: `${getBorderColor()}40` }}>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="font-black uppercase"
                style={{
                  backgroundColor: getBorderColor(),
                  color: '#000',
                }}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </Card>
        )}

        {!selectedUser && (
          <Card
            className="lg:col-span-2 flex items-center justify-center h-[calc(100vh-12rem)]"
            style={{
              backgroundColor: '#ffffff',
              borderColor: getBorderColor(),
              borderWidth: '2px',
            }}
          >
            <p className="text-gray-500">Select a user to edit their profile</p>
          </Card>
        )}
      </div>
    </div>
  )
}
