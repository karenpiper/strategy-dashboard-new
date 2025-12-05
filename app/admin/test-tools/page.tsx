'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'
import { useMode } from '@/contexts/mode-context'
import { createClient } from '@/lib/supabase/client'
import { 
  MessageSquare,
  Loader2,
  AlertCircle,
  UserX,
  RefreshCw
} from 'lucide-react'

export default function TestToolsPage() {
  const { user } = useAuth()
  const { mode } = useMode()
  const supabase = createClient()
  const [testingSlack, setTestingSlack] = useState(false)
  const [resettingProfile, setResettingProfile] = useState(false)

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

  const handleResetProfile = async () => {
    if (!user) {
      alert('You must be logged in to reset your profile')
      return
    }

    // Confirm action
    const confirmed = confirm(
      '⚠️ WARNING: This will delete your profile temporarily.\n\n' +
      'After clicking OK, refresh the page to test the profile creation flow.\n\n' +
      'Your profile will be automatically recreated with basic OAuth details, ' +
      'and you\'ll be redirected to the profile setup page.\n\n' +
      'Continue?'
    )

    if (!confirmed) return

    setResettingProfile(true)
    try {
      const response = await fetch('/api/profiles/test-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()
      if (response.ok) {
        alert(
          '✅ Profile deleted successfully!\n\n' +
          'Please refresh the page to test the profile creation flow.\n\n' +
          'You will be redirected to the profile setup page.'
        )
        // Refresh the page after a short delay
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      } else {
        alert(`❌ Error: ${data.error || 'Failed to reset profile'}\n\n${data.details || ''}`)
      }
    } catch (error: any) {
      console.error('Error resetting profile:', error)
      alert(`❌ Error: ${error.message || 'Failed to reset profile'}`)
    } finally {
      setResettingProfile(false)
    }
  }

  return (
    <div className={`${getBgClass()} ${mode === 'code' ? 'font-mono' : 'font-[family-name:var(--font-raleway)]'}`}>
      {/* Header */}
      <div className="mb-8">
        <h1 className={`text-4xl font-black uppercase ${getTextClass()} mb-2`}>Test Tools</h1>
        <p className={`${getTextClass()}/70 font-normal`}>
          Testing and debugging tools for admin users.
        </p>
      </div>

      {/* Testing Tools */}
      <div className="mb-8">
        <h2 className={`text-2xl font-black uppercase tracking-wider ${getTextClass()} mb-4`}>Slack Integration</h2>
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

      {/* Profile Testing */}
      <div className="mb-8">
        <h2 className={`text-2xl font-black uppercase tracking-wider ${getTextClass()} mb-4`}>Profile Testing</h2>
        <Card className={`${getCardStyle().bg} ${getCardStyle().border} border p-6 ${getRoundedClass('rounded-xl')}`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`text-lg font-black uppercase ${getCardStyle().text} mb-2`}>Reset Profile (Test)</h3>
              <p className={`${getCardStyle().text}/70 text-sm mb-4`}>
                Temporarily delete your profile to test the profile creation and setup flow. 
                Your profile will be automatically recreated with basic OAuth details, and you'll be redirected to the setup page.
              </p>
              <p className={`${getCardStyle().text}/50 text-xs italic`}>
                ⚠️ Only works in development mode. Your profile will be recreated automatically.
              </p>
            </div>
            <Button
              onClick={handleResetProfile}
              disabled={resettingProfile}
              className={`${getRoundedClass('rounded-lg')} ${
                mode === 'chaos' ? 'bg-[#C4F500] text-black hover:bg-[#C4F500]/80' :
                mode === 'chill' ? 'bg-[#FFC043] text-[#4A1818] hover:bg-[#FFC043]/80' :
                'bg-[#FFFFFF] text-black hover:bg-[#FFFFFF]/80'
              } font-black uppercase tracking-wider ${mode === 'code' ? 'font-mono' : ''}`}
            >
              {resettingProfile ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Resetting...
                </>
              ) : (
                <>
                  <UserX className="w-4 h-4 mr-2" />
                  Reset Profile
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>

      {/* Info Section */}
      <Card className={`${getCardStyle().bg} ${getCardStyle().border} border p-6 ${getRoundedClass('rounded-xl')}`}>
        <div className="flex items-start gap-3">
          <AlertCircle className={`w-6 h-6`} style={{ color: getCardStyle().accent }} />
          <div>
            <h3 className={`text-xl font-black uppercase tracking-wider ${getCardStyle().text} mb-2`}>About Test Tools</h3>
            <p className={`${getCardStyle().text}/70 mb-3`}>
              Use these tools to test and verify integrations are working correctly.
            </p>
            <ul className={`space-y-1 ${getCardStyle().text}/70 text-sm`}>
              <li>• Test Slack DM: Sends a test message to your Slack account</li>
              <li>• Make sure your profile has a Slack ID configured</li>
              <li>• Check your Slack DMs after testing</li>
              <li>• Reset Profile: Deletes your profile to test the creation flow (dev only)</li>
              <li>• Profile will be automatically recreated with OAuth details</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  )
}



