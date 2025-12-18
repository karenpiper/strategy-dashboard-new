'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useMode } from '@/contexts/mode-context'
import { useAuth } from '@/contexts/auth-context'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { Music, Calendar, User, Loader2, ExternalLink, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface CuratorAssignment {
  id: string
  curator_name: string
  curator_profile_id: string | null
  assignment_date: string
  start_date: string
  end_date: string
  playlists: {
    id: string
    date: string
    title: string | null
    spotify_url: string
  } | null
}

export default function CuratePage() {
  const { mode } = useMode()
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const assignmentId = searchParams.get('assignment')
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [assignment, setAssignment] = useState<CuratorAssignment | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }

    if (assignmentId && user) {
      fetchAssignment()
    } else {
      setError('No assignment ID provided')
      setLoading(false)
    }
  }, [assignmentId, user, authLoading])

  const fetchAssignment = async () => {
    if (!assignmentId) return

    try {
      const { data, error } = await supabase
        .from('curator_assignments')
        .select(`
          id,
          curator_name,
          curator_profile_id,
          assignment_date,
          start_date,
          end_date,
          playlists(id, date, title, spotify_url)
        `)
        .eq('id', assignmentId)
        .single()

      if (error) throw error

      // Verify this assignment belongs to the current user
      if (data.curator_profile_id !== user?.id) {
        setError('This assignment does not belong to you')
        setLoading(false)
        return
      }

      setAssignment(data)
    } catch (err: any) {
      console.error('Error fetching assignment:', err)
      setError(err.message || 'Failed to load assignment')
    } finally {
      setLoading(false)
    }
  }

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
    } else {
      return { 
        bg: 'bg-[#000000]', 
        border: 'border border-[#FFFFFF]', 
        text: 'text-[#FFFFFF]', 
        accent: '#FFFFFF' 
      }
    }
  }

  const getRoundedClass = (base: string) => {
    if (mode === 'chaos') return base.replace('rounded', 'rounded-[1.5rem]')
    if (mode === 'chill') return base.replace('rounded', 'rounded-2xl')
    return base
  }

  const cardStyle = getCardStyle()

  if (loading || authLoading) {
    return (
      <div className={`${getBgClass()} ${getTextClass()} min-h-screen flex items-center justify-center`}>
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  if (error || !assignment) {
    return (
      <div className={`${getBgClass()} ${getTextClass()} min-h-screen p-6 flex items-center justify-center`}>
        <Card className={`${cardStyle.bg} ${cardStyle.border} border p-6 ${getRoundedClass('rounded-xl')} max-w-md`}>
          <p className={cardStyle.text}>{error || 'Assignment not found'}</p>
          <Link href="/">
            <Button className="mt-4">Go Home</Button>
          </Link>
        </Card>
      </div>
    )
  }

  const startDate = new Date(assignment.start_date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  const endDate = new Date(assignment.end_date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  const today = new Date()
  const startDateObj = new Date(assignment.start_date)
  const endDateObj = new Date(assignment.end_date)
  const isActive = today >= startDateObj && today <= endDateObj
  const isUpcoming = today < startDateObj

  return (
    <div className={`${getBgClass()} ${getTextClass()} ${mode === 'code' ? 'font-mono' : 'font-[family-name:var(--font-raleway)]'} min-h-screen p-6`}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className={`text-3xl font-black uppercase tracking-wider ${getTextClass()} mb-2`}>Curator Dashboard</h1>
          <p className={`${getTextClass()}/70 text-sm`}>Your curation period details and tools</p>
        </div>

        <Card className={`${cardStyle.bg} ${cardStyle.border} border p-6 ${getRoundedClass('rounded-xl')} mb-6`}>
          <div className="flex items-start gap-4 mb-6">
            <div className={`p-3 ${getRoundedClass('rounded-lg')} ${
              mode === 'chaos' ? 'bg-[#C4F500]/20' :
              mode === 'chill' ? 'bg-[#FFC043]/20' :
              'bg-white/10'
            }`}>
              <Music className={`w-6 h-6 ${getTextClass()}`} />
            </div>
            <div className="flex-1">
              <h2 className={`text-2xl font-black uppercase ${getTextClass()} mb-2`}>
                {assignment.curator_name}
              </h2>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className={`w-4 h-4 ${getTextClass()}/60`} />
                  <span className={`text-sm ${getTextClass()}/80`}>
                    {startDate} - {endDate}
                  </span>
                </div>
                {isActive && (
                  <span className={`px-3 py-1 ${getRoundedClass('rounded-full')} text-xs font-bold ${
                    mode === 'chaos' ? 'bg-[#C4F500] text-black' :
                    mode === 'chill' ? 'bg-[#FFC043] text-[#4A1818]' :
                    'bg-white text-black'
                  }`}>
                    Active Now
                  </span>
                )}
                {isUpcoming && (
                  <span className={`px-3 py-1 ${getRoundedClass('rounded-full')} text-xs font-bold ${cardStyle.border} border ${getTextClass()}/60`}>
                    Starts Soon
                  </span>
                )}
              </div>
            </div>
          </div>

          {assignment.playlists ? (
            <div className={`${cardStyle.border} border ${getRoundedClass('rounded-lg')} p-4 mb-4`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={`font-semibold ${cardStyle.text} mb-1`}>
                    {assignment.playlists.title || 'Untitled Playlist'}
                  </h3>
                  <p className={`text-sm ${cardStyle.text}/70`}>
                    Created on {new Date(assignment.playlists.date).toLocaleDateString()}
                  </p>
                </div>
                {assignment.playlists.spotify_url && (
                  <a
                    href={assignment.playlists.spotify_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${getRoundedClass('rounded-lg')} px-4 py-2 flex items-center gap-2 ${
                      mode === 'chaos' ? 'bg-[#C4F500] text-black hover:bg-[#C4F500]/80' :
                      mode === 'chill' ? 'bg-[#FFC043] text-[#4A1818] hover:bg-[#FFC043]/80' :
                      'bg-[#FFFFFF] text-black hover:bg-[#FFFFFF]/80'
                    } font-semibold`}
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Playlist
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div className={`${cardStyle.border} border ${getRoundedClass('rounded-lg')} p-6 text-center mb-4`}>
              <p className={`${cardStyle.text}/70 mb-4`}>
                {isUpcoming 
                  ? 'Your curation period hasn\'t started yet. You can create your playlist starting on the start date.'
                  : 'No playlist created yet. Create your playlist now!'}
              </p>
              <Link href="/admin/playlists">
                <Button
                  disabled={isUpcoming}
                  className={`${getRoundedClass('rounded-lg')} ${
                    mode === 'chaos' ? 'bg-[#C4F500] text-black hover:bg-[#C4F500]/80' :
                    mode === 'chill' ? 'bg-[#FFC043] text-[#4A1818] hover:bg-[#FFC043]/80' :
                    'bg-[#FFFFFF] text-black hover:bg-[#FFFFFF]/80'
                  } font-black uppercase tracking-wider`}
                >
                  <Music className="w-4 h-4 mr-2" />
                  Create Playlist
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          )}

          <div className={`${cardStyle.border} border-t pt-4 mt-4`}>
            <h3 className={`font-semibold ${cardStyle.text} mb-2`}>What to do:</h3>
            <ol className={`list-decimal list-inside space-y-2 ${cardStyle.text}/80 text-sm`}>
              <li>Create a Spotify playlist with your curated songs</li>
              <li>Go to Admin → Playlists and add your playlist</li>
              <li>Add a description explaining your curation choices</li>
              <li>Your playlist will be featured during your curation period</li>
            </ol>
          </div>
        </Card>
      </div>
    </div>
  )
}






