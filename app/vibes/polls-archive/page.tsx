'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { useMode } from '@/contexts/mode-context'
import { SiteHeader } from '@/components/site-header'
import { Footer } from '@/components/footer'
import { ArrowLeft, Users, MessageCircle, Calendar, Quote, Archive, Music, BarChart3, Lock, TrendingUp, Zap } from 'lucide-react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface WeeklyQuestionAnswer {
  id: string
  answer_text: string
  author: string
  created_at: string
}

interface HistoricalWeek {
  week_start_date: string
  question_text: string
  total_answers: number
  answers: WeeklyQuestionAnswer[]
}

export default function PollsArchivePage() {
  const { user, loading: authLoading } = useAuth()
  const { mode } = useMode()
  const router = useRouter()
  const [weeks, setWeeks] = useState<HistoricalWeek[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPoll, setSelectedPoll] = useState<any>(null)
  const [isPollDialogOpen, setIsPollDialogOpen] = useState(false)

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
    return mode === 'code' ? 'rounded-none' : base
  }

  const getAccentColor = () => {
    return mode === 'chaos' ? '#C4F500' : mode === 'chill' ? '#FFC043' : '#FFFFFF'
  }

  // PURPLE SYSTEM colors for vibes page
  // Primary: Bright Purple (#9D4EFF), Secondary: Deep Purple (#6B21A8), Complementary: Lavender (#C4B5FD), Contrast: Yellow (#FBBF24)
  const getPurpleSystemColors = () => {
    if (mode === 'chaos') {
      return {
        primary: '#9D4EFF',      // Bright Purple
        secondary: '#6B21A8',   // Deep Purple
        complementary: '#C4B5FD', // Lavender
        contrast: '#FBBF24',    // Yellow
        bg: '#1A1A1A',
        text: '#FFFFFF',
        cardBg: '#2A2A2A'
      }
    } else if (mode === 'chill') {
      return {
        primary: '#9D4EFF',      // Bright Purple
        secondary: '#6B21A8',   // Deep Purple
        complementary: '#C4B5FD', // Lavender
        contrast: '#FBBF24',    // Yellow
        bg: '#F5E6D3',
        text: '#4A1818',
        cardBg: '#FFFFFF'
      }
    } else {
      return {
        primary: '#FFFFFF',
        secondary: '#808080',
        complementary: '#666666',
        contrast: '#FFFFFF',
        bg: '#000000',
        text: '#FFFFFF',
        cardBg: '#1a1a1a'
      }
    }
  }

  const purpleColors = getPurpleSystemColors()

  // Get emoji for poll items
  const getPollItemEmoji = (itemName: string): string => {
    const name = itemName.toLowerCase()
    
    // Thanksgiving poll emojis
    if (name.includes('stuffing')) return '🍞'
    if (name.includes('mashed potato')) return '🥔'
    if (name.includes('peking duck')) return '🦆'
    if (name.includes('pumpkin pie')) return '🎃'
    if (name.includes('gravy')) return '🥘'
    if (name.includes('turkey')) return '🦃'
    
    // Movie soundtrack emojis
    if (name.includes('garden state')) return '🌳'
    if (name.includes('good will hunting')) return '🧠'
    if (name.includes('purple rain')) return '💜'
    if (name.includes('interstellar')) return '🌌'
    if (name.includes('trainspotting')) return '🚂'
    if (name.includes('scott pilgrim')) return '🎮'
    if (name.includes('marie antoinette')) return '👑'
    if (name.includes('royal tenenbaums')) return '🎭'
    if (name.includes('twilight')) return '🌙'
    if (name.includes('black panther')) return '🐆'
    
    // Default emoji
    return '✨'
  }

  const formatWeekDate = (weekStartDate: string) => {
    const date = new Date(weekStartDate)
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  useEffect(() => {
    if (!user && !authLoading) {
      router.push('/login')
      return
    }

    async function fetchHistoricalData() {
      try {
        const response = await fetch('/api/weekly-questions/historical')
        if (response.ok) {
          const data = await response.json()
          setWeeks(data.weeks || [])
        }
      } catch (error) {
        console.error('Error fetching historical polls:', error)
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchHistoricalData()
    }
  }, [user, authLoading, router])

  if (authLoading || !user) {
    return (
      <div className={`flex flex-col min-h-screen ${getBgClass()} ${getTextClass()}`}>
        <SiteHeader />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-lg opacity-60">Loading...</p>
        </main>
      </div>
    )
  }

  return (
    <div className={`flex flex-col min-h-screen ${getBgClass()} ${getTextClass()} ${mode === 'code' ? 'font-mono' : 'font-[family-name:var(--font-raleway)]'}`}>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes emojiBounce {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-10px) scale(1.1); }
        }
        .animated-emoji {
          animation: emojiBounce 2s ease-in-out infinite;
          display: inline-block;
        }
      `}} />
      <SiteHeader />

      <main className="max-w-[1200px] mx-auto px-6 py-10 flex-1 pt-24">
        <div className="flex gap-6">
          {/* Sidebar */}
          <Card className={`w-80 flex-shrink-0 min-w-80 hidden lg:block ${getRoundedClass('rounded-[2.5rem]')} p-6 flex flex-col h-fit sticky top-24 self-start`}
            style={{
              backgroundColor: mode === 'chaos' 
                ? 'rgba(255, 255, 255, 0.05)' 
                : mode === 'chill'
                ? 'rgba(74, 24, 24, 0.05)'
                : 'rgba(255, 255, 255, 0.05)',
              border: mode === 'chaos' 
                ? '1px solid rgba(255, 255, 255, 0.1)' 
                : mode === 'chill'
                ? '1px solid rgba(74, 24, 24, 0.1)'
                : '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            <div className="flex items-center gap-2 mb-6">
              <Archive className="w-5 h-5" style={{ 
                color: purpleColors.primary
              }} />
              <h3 className={`text-sm uppercase tracking-wider font-black ${getTextClass()}`}>
                Archive
              </h3>
            </div>
            <div className="space-y-3">
              <Link
                href="/vibes"
                className={`flex items-center gap-3 ${getRoundedClass('rounded-xl')} px-4 py-3 transition-all hover:opacity-70`}
                style={{
                  backgroundColor: mode === 'chaos' 
                    ? 'rgba(255, 255, 255, 0.05)' 
                    : mode === 'chill'
                    ? 'rgba(74, 24, 24, 0.05)'
                    : 'rgba(255, 255, 255, 0.05)'
                }}
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-semibold">Vibes</span>
              </Link>
              <Link
                href="/vibes/playlist-archive"
                className={`flex items-center gap-3 ${getRoundedClass('rounded-xl')} px-4 py-3 transition-all hover:opacity-70`}
                style={{
                  backgroundColor: mode === 'chaos' 
                    ? 'rgba(255, 255, 255, 0.05)' 
                    : mode === 'chill'
                    ? 'rgba(74, 24, 24, 0.05)'
                    : 'rgba(255, 255, 255, 0.05)'
                }}
              >
                <Music className="w-4 h-4" />
                <span className="text-sm font-semibold">Playlist Archive</span>
              </Link>
              <Link
                href="/vibes/polls-archive"
                className={`flex items-center gap-3 ${getRoundedClass('rounded-xl')} px-4 py-3 transition-all hover:opacity-70`}
                style={{
                  backgroundColor: mode === 'chaos' 
                    ? 'rgba(255, 255, 255, 0.05)' 
                    : mode === 'chill'
                    ? 'rgba(74, 24, 24, 0.05)'
                    : 'rgba(255, 255, 255, 0.05)'
                }}
              >
                <MessageCircle className="w-4 h-4" />
                <span className="text-sm font-semibold">Polls Archive</span>
              </Link>
            </div>
          </Card>

          {/* Main Content Area */}
          <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="mb-12">
          <Link 
            href="/vibes" 
            className={`inline-flex items-center gap-2 mb-6 text-sm uppercase tracking-wider hover:opacity-70 transition-opacity ${getTextClass()}`}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Vibes
          </Link>
          <h1 className={`text-6xl font-black uppercase mb-4 ${getTextClass()}`}>Polls Archive</h1>
          <p className={`text-xl ${getTextClass()} opacity-70`}>
            A visual journey through weekly questions and team responses
          </p>
        </div>

        {/* Hardcoded Poll Cards */}
        <div className="mb-12">
          <h2 className={`text-4xl font-black mb-6 ${getTextClass()}`}>Polls Archive</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Thanksgiving Poll Card */}
            <Card 
              className={`${getRoundedClass('rounded-[2.5rem]')} p-6 cursor-pointer transition-all hover:scale-105 hover:shadow-2xl`}
              style={{
                backgroundColor: mode === 'chaos' 
                  ? 'rgba(255, 255, 255, 0.05)' 
                  : mode === 'chill'
                  ? 'rgba(74, 24, 24, 0.05)'
                  : 'rgba(255, 255, 255, 0.05)',
                border: mode === 'chaos' 
                  ? '1px solid rgba(255, 255, 255, 0.1)' 
                  : mode === 'chill'
                  ? '1px solid rgba(74, 24, 24, 0.1)'
                  : '1px solid rgba(255, 255, 255, 0.1)'
              }}
              onClick={() => {
                const allData = [
                  { name: 'Stuffing', count: 7 },
                  { name: 'Mashed potatoes', count: 3 },
                  { name: 'Peking duck', count: 2 },
                  { name: 'Pumpkin pie', count: 2 },
                  { name: 'Gravy', count: 2 },
                  { name: 'Fried turkey', count: 1 },
                  { name: 'Turkey breast', count: 1 },
                  { name: 'Peppercorn encrusted filet mignon', count: 1 },
                  { name: 'Outdoor KBBQ', count: 1 },
                  { name: 'Chicken biriyani', count: 1 },
                  { name: 'Jollof rice', count: 1 },
                  { name: 'Arepas', count: 1 },
                  { name: 'Empanadas', count: 1 },
                  { name: 'Ham', count: 1 },
                  { name: 'Funeral potatoes', count: 1 },
                  { name: 'Cornbread', count: 1 },
                  { name: 'Corn soufflé', count: 1 },
                  { name: 'Fire-roasted sweet potatoes', count: 1 },
                  { name: 'Butternut squash', count: 1 },
                  { name: 'Sweet potato pie', count: 1 },
                  { name: 'Caramel custard', count: 1 },
                  { name: 'Custard pie', count: 1 },
                  { name: 'Dessert spread', count: 1 },
                  { name: 'Dots candy', count: 1 },
                  { name: 'Trolli exploding worms', count: 1 },
                  { name: 'White Monster', count: 1 },
                  { name: 'Eggnog', count: 1 },
                  { name: 'Appetizer red wine', count: 1 },
                  { name: 'Dinner red wine', count: 1 },
                  { name: 'Dessert amaro', count: 1 },
                  { name: 'Peanut butter whiskey "during gravy"', count: 1 },
                  { name: 'Skinny French cigarette', count: 1 },
                  { name: 'Capri cigarettes with my mother in law and great aunt', count: 1 },
                  { name: 'Caviar before dinner', count: 1 },
                  { name: 'Cheese plate before', count: 1 },
                  { name: 'All of the above mixed together in one perfect bite', count: 1 },
                  { name: 'Green bean casserole', count: 1 },
                  { name: 'Horseradish mashed potatoes', count: 1 },
                  { name: 'Hongshaorou', count: 1 },
                ]
                const fullData = allData.sort((a, b) => b.count - a.count)
                
                setSelectedPoll({
                  id: 'thanksgiving-grub',
                  title: 'Thanksgiving Grub',
                  question: 'What are your top Thanksgiving dishes?',
                  date: 'November 2024',
                  totalResponses: 14,
                  data: fullData,
                  oneVoters: []
                })
                setIsPollDialogOpen(true)
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <BarChart3 className="w-6 h-6" style={{ color: purpleColors.primary }} />
                <h3 className={`text-xl font-black uppercase ${getTextClass()}`}>Thanksgiving Grub</h3>
              </div>
              <p className={`text-sm mb-4 ${getTextClass()} opacity-70`}>
                What are your top Thanksgiving dishes?
              </p>
              <div className={`flex items-center justify-between text-xs opacity-60 ${getTextClass()}`}>
                <span>14 responses</span>
                <span>Nov 2024</span>
              </div>
            </Card>

            {/* The Great Sandwich Schism Poll Card */}
            <Card 
              className={`${getRoundedClass('rounded-[2.5rem]')} p-6 cursor-pointer transition-all hover:scale-105 hover:shadow-2xl`}
              style={{
                backgroundColor: mode === 'chaos' 
                  ? 'rgba(255, 255, 255, 0.05)' 
                  : mode === 'chill'
                  ? 'rgba(74, 24, 24, 0.05)'
                  : 'rgba(255, 255, 255, 0.05)',
                border: mode === 'chaos' 
                  ? '1px solid rgba(255, 255, 255, 0.1)' 
                  : mode === 'chill'
                  ? '1px solid rgba(74, 24, 24, 0.1)'
                  : '1px solid rgba(255, 255, 255, 0.1)'
              }}
              onClick={() => {
                const sandwichData = [
                  { name: 'Team Chopped Cheese', count: 4, participants: ['Julian', 'Peter', 'Pat', 'Karen'] },
                  { name: 'Team Cheesesteak', count: 3, participants: ['Rebecca', 'Anne', 'The Philly commenter', 'Adam (partial overlap)'] },
                  { name: 'Team "They Are Different Foods, Stop Fighting"', count: 2, participants: ['Adam (later)', 'Jordan'] },
                  { name: 'Team Never Had One', count: 1, participants: ['Laura'] },
                  { name: 'Team Wawa Hoagie Truthers', count: 0, participants: ['Arjun', 'Rebecca', 'Kenan'], note: 'Not a stance' },
                ]
                
                setSelectedPoll({
                  id: 'great-sandwich-schism',
                  title: 'The Great Sandwich Schism',
                  question: 'This chat behaves like a poll even though nobody called it that.',
                  date: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
                  totalResponses: 10,
                  data: sandwichData,
                  isSandwichPoll: true,
                  imageUrl: '/emotional-geography-sandwiches.png',
                  bigTakeaway: 'A big takeaway'
                })
                setIsPollDialogOpen(true)
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <BarChart3 className="w-6 h-6" style={{ color: purpleColors.primary }} />
                <h3 className={`text-xl font-black uppercase ${getTextClass()}`}>The Great Sandwich Schism</h3>
              </div>
              <p className={`text-sm mb-4 ${getTextClass()} opacity-70`}>
                This chat behaves like a poll even though nobody called it that.
              </p>
              <div className={`flex items-center justify-between text-xs opacity-60 ${getTextClass()}`}>
                <span>10 responses</span>
                <span>{new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
              </div>
            </Card>

            {/* Top 5 Movie Soundtracks Poll Card */}
            <Card 
              className={`${getRoundedClass('rounded-[2.5rem]')} p-6 cursor-pointer transition-all hover:scale-105 hover:shadow-2xl`}
              style={{
                backgroundColor: mode === 'chaos' 
                  ? 'rgba(255, 255, 255, 0.05)' 
                  : mode === 'chill'
                  ? 'rgba(74, 24, 24, 0.05)'
                  : 'rgba(255, 255, 255, 0.05)',
                border: mode === 'chaos' 
                  ? '1px solid rgba(255, 255, 255, 0.1)' 
                  : mode === 'chill'
                  ? '1px solid rgba(74, 24, 24, 0.1)'
                  : '1px solid rgba(255, 255, 255, 0.1)'
              }}
              onClick={() => {
                const ranking = [
                  { rank: 1, name: 'Garden State' },
                  { rank: 2, name: 'Good Will Hunting' },
                  { rank: 3, name: 'Purple Rain' },
                  { rank: 4, name: 'Interstellar' },
                  { rank: 5, name: 'Trainspotting' },
                  { rank: 6, name: 'Scott Pilgrim vs the World' },
                  { rank: 7, name: 'Marie Antoinette' },
                  { rank: 8, name: 'The Royal Tenenbaums' },
                  { rank: 9, name: 'Twilight' },
                  { rank: 10, name: 'Black Panther' },
                ]
                
                setSelectedPoll({
                  id: 'top-5-movie-soundtracks',
                  title: 'Top 5 Movie Soundtracks',
                  question: 'Top 5 movie sound tracks - ranked. You can choose to isolate musicals from non-musicals or combine',
                  askedBy: 'Rebecca Smith',
                  date: 'November 21, 2024',
                  totalResponses: 3,
                  ranking: ranking,
                  isRanking: true
                })
                setIsPollDialogOpen(true)
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <BarChart3 className="w-6 h-6" style={{ color: purpleColors.primary }} />
                <h3 className={`text-xl font-black uppercase ${getTextClass()}`}>Top 5 Movie Soundtracks</h3>
              </div>
              <p className={`text-sm mb-4 ${getTextClass()} opacity-70`}>
                Top 5 movie sound tracks - ranked. You can choose to isolate musicals from non-musicals or combine
              </p>
              <div className={`flex items-center justify-between text-xs opacity-60 ${getTextClass()}`}>
                <span>3 responses</span>
                <span>Nov 21</span>
              </div>
            </Card>

            {/* Shows to Binge Poll Card */}
            <Card 
              className={`${getRoundedClass('rounded-[2.5rem]')} p-6 cursor-pointer transition-all hover:scale-105 hover:shadow-2xl`}
              style={{
                backgroundColor: mode === 'chaos' 
                  ? 'rgba(255, 255, 255, 0.05)' 
                  : mode === 'chill'
                  ? 'rgba(74, 24, 24, 0.05)'
                  : 'rgba(255, 255, 255, 0.05)',
                border: mode === 'chaos' 
                  ? '1px solid rgba(255, 255, 255, 0.1)' 
                  : mode === 'chill'
                  ? '1px solid rgba(74, 24, 24, 0.1)'
                  : '1px solid rgba(255, 255, 255, 0.1)'
              }}
              onClick={() => {
                const showsData = [
                  { name: 'Gossip Girl', secretsPerSeason: 14, percentChangeNothing: 72, gaspsPerMinute: 0.42 },
                  { name: 'Pretty Little Liars', secretsPerSeason: 18, percentChangeNothing: 81, gaspsPerMinute: 0.55 },
                  { name: 'Laguna Beach', secretsPerSeason: 6, percentChangeNothing: 67, gaspsPerMinute: 0.18 },
                  { name: 'The OC', secretsPerSeason: 9, percentChangeNothing: 58, gaspsPerMinute: 0.22 },
                  { name: 'Veronica Mars', secretsPerSeason: 11, percentChangeNothing: 49, gaspsPerMinute: 0.35 },
                  { name: 'Buffy', secretsPerSeason: 7, percentChangeNothing: 38, gaspsPerMinute: 0.14 }
                ]
                
                setSelectedPoll({
                  id: 'shows-to-binge',
                  title: 'Shows to Binge',
                  question: 'TV Show Statistics Analysis',
                  date: 'December 2024',
                  totalResponses: 6,
                  shows: showsData,
                  isShowsToBinge: true
                })
                setIsPollDialogOpen(true)
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <BarChart3 className="w-6 h-6" style={{ color: purpleColors.primary }} />
                <h3 className={`text-xl font-black uppercase ${getTextClass()}`}>Shows to Binge</h3>
              </div>
              <p className={`text-sm mb-4 ${getTextClass()} opacity-70`}>
                TV Show Statistics Analysis
              </p>
              <div className={`flex items-center justify-between text-xs opacity-60 ${getTextClass()}`}>
                <span>6 shows</span>
                <span>Dec 2024</span>
              </div>
            </Card>

            {/* Butt Rock Edition Poll Card */}
            <Card 
              className={`${getRoundedClass('rounded-[2.5rem]')} p-6 cursor-pointer transition-all hover:scale-105 hover:shadow-2xl`}
              style={{
                backgroundColor: mode === 'chaos' 
                  ? 'rgba(255, 255, 255, 0.05)' 
                  : mode === 'chill'
                  ? 'rgba(74, 24, 24, 0.05)'
                  : 'rgba(255, 255, 255, 0.05)',
                border: mode === 'chaos' 
                  ? '1px solid rgba(255, 255, 255, 0.1)' 
                  : mode === 'chill'
                  ? '1px solid rgba(74, 24, 24, 0.1)'
                  : '1px solid rgba(255, 255, 255, 0.1)'
              }}
              onClick={() => {
                const topSongs = [
                  { name: 'How You Remind Me', artist: 'Nickelback', count: 2 },
                  { name: "It's Been Awhile", artist: 'Staind', count: 2 },
                  { name: 'Headstrong', artist: 'Trapt', count: 2 },
                  { name: 'Click Click Boom', artist: 'Saliva', count: 2 },
                  { name: 'Last Resort', artist: 'Papa Roach', count: 2 },
                  { name: 'She Hates Me', artist: 'Puddle of Mudd', count: 2 },
                  { name: 'Crawling in the Dark', artist: 'Hoobastank', count: 2 },
                ]
                
                const singleMentionTracks = [
                  { name: 'I Hate Everything About You', artist: 'Three Days Grace' },
                  { name: 'Blurry', artist: 'Puddle of Mudd' },
                  { name: 'Hemorrhage', artist: 'Fuel' },
                  { name: 'So Cold', artist: 'Breaking Benjamin' },
                  { name: 'Higher', artist: 'Creed' },
                  { name: 'Someday / How You Remind Me mashup', artist: 'Nickelback' },
                  { name: "It's Not Over", artist: 'Daughtry' },
                  { name: 'Kryptonite', artist: '3 Doors Down' },
                  { name: 'Butterfly', artist: 'Crazy Town' },
                  { name: 'I Stand Alone', artist: 'Godsmack' },
                  { name: 'Send the Pain Below', artist: 'Chevelle' },
                ]
                
                const artistFrequency = [
                  'Nickelback',
                  'Staind',
                  'Hoobastank',
                  'Puddle of Mudd',
                  'Papa Roach',
                  'Saliva',
                  'Trapt'
                ]
                
                setSelectedPoll({
                  id: 'butt-rock-edition',
                  title: 'Poll Results: Butt Rock Edition',
                  question: 'I pulled every song mentioned. I counted duplicates. I grouped by artist so you can see where the group instinctively converged.',
                  date: '2024',
                  totalResponses: 0,
                  topSongs: topSongs,
                  singleMentionTracks: singleMentionTracks,
                  artistFrequency: artistFrequency,
                  isButtRock: true
                })
                setIsPollDialogOpen(true)
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <BarChart3 className="w-6 h-6" style={{ color: purpleColors.primary }} />
                <h3 className={`text-xl font-black uppercase ${getTextClass()}`}>Butt Rock Edition</h3>
              </div>
              <p className={`text-sm mb-4 ${getTextClass()} opacity-70`}>
                Poll Results: Butt Rock Edition
              </p>
              <div className={`flex items-center justify-between text-xs opacity-60 ${getTextClass()}`}>
                <span>Poll Results</span>
                <span>2024</span>
              </div>
            </Card>
          </div>
        </div>

        {/* Weekly Questions Archive */}
        {weeks.length === 0 ? (
          <div className="text-center py-20">
            <p className={`text-lg ${getTextClass()} opacity-60`}>No weekly question data available yet</p>
          </div>
        ) : (
          <div className="space-y-24">
            {weeks.map((week, weekIndex) => {
              return (
                <section 
                  key={week.week_start_date}
                  className="relative"
                  style={{ 
                    scrollMarginTop: '100px',
                    animation: `fadeInUp 0.8s ease-out ${weekIndex * 0.1}s both`
                  }}
                >
                  {/* Week Header - Large, Story-like */}
                  <div className="mb-12">
                    <div className="flex items-baseline gap-4 mb-4">
                      <h2 className={`text-5xl font-black uppercase ${getTextClass()}`}>
                        {formatWeekDate(week.week_start_date)}
                      </h2>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <MessageCircle className="w-6 h-6" style={{ color: getAccentColor() }} />
                          <span className={`text-2xl ${getTextClass()} opacity-70`}>
                            {week.total_answers} {week.total_answers === 1 ? 'answer' : 'answers'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6 text-sm uppercase tracking-wider opacity-60 mb-8">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>Week of {formatWeekDate(week.week_start_date)}</span>
                      </div>
                    </div>

                    {/* Question - Large Display */}
                    <div 
                      className={`${getRoundedClass('rounded-3xl')} p-12 mb-12 relative overflow-hidden`}
                      style={{
                        backgroundColor: mode === 'chaos' 
                          ? 'rgba(196, 245, 0, 0.1)' 
                          : mode === 'chill'
                          ? 'rgba(255, 192, 67, 0.1)'
                          : 'rgba(255, 255, 255, 0.05)',
                        border: `2px solid ${getAccentColor()}40`
                      }}
                    >
                      <Quote 
                        className="absolute top-6 left-6 opacity-20" 
                        style={{ color: getAccentColor() }}
                        size={60}
                      />
                      <h3 className={`text-4xl font-black leading-tight relative z-10 ${getTextClass()}`}>
                        {week.question_text}
                      </h3>
                    </div>
                  </div>

                  {/* Answers Grid - Infographic Style */}
                  {week.answers.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                      {week.answers.map((answer, aIndex) => (
                        <div
                          key={answer.id}
                          className={`${getRoundedClass('rounded-2xl')} p-6 relative overflow-hidden`}
                          style={{
                            backgroundColor: mode === 'chaos' 
                              ? 'rgba(255, 255, 255, 0.05)' 
                              : mode === 'chill'
                              ? 'rgba(74, 24, 24, 0.05)'
                              : 'rgba(255, 255, 255, 0.05)',
                            border: `1px solid ${getAccentColor()}30`,
                            animation: `fadeInUp 0.6s ease-out ${(weekIndex * 0.1) + (aIndex * 0.05)}s both`
                          }}
                        >
                          <Quote 
                            className="absolute top-4 right-4 opacity-10" 
                            style={{ color: getAccentColor() }}
                            size={40}
                          />
                          <p 
                            className={`text-base leading-relaxed mb-4 relative z-10 ${getTextClass()}`}
                            style={{ lineHeight: '1.8' }}
                          >
                            "{answer.answer_text}"
                          </p>
                          <div className="flex items-center gap-2 pt-4 border-t relative z-10" style={{ 
                            borderColor: mode === 'chaos' 
                              ? 'rgba(255, 255, 255, 0.1)' 
                              : mode === 'chill'
                              ? 'rgba(74, 24, 24, 0.1)'
                              : 'rgba(255, 255, 255, 0.1)'
                          }}>
                            <div 
                              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black"
                              style={{ 
                                backgroundColor: getAccentColor(),
                                color: mode === 'chaos' ? '#000000' : mode === 'chill' ? '#4A1818' : '#000000'
                              }}
                            >
                              {answer.author.charAt(0).toUpperCase()}
                            </div>
                            <span className={`text-sm font-semibold ${getTextClass()} opacity-80`}>
                              {answer.author}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={`${getRoundedClass('rounded-2xl')} p-12 text-center`} style={{
                      backgroundColor: mode === 'chaos' 
                        ? 'rgba(255, 255, 255, 0.05)' 
                        : mode === 'chill'
                        ? 'rgba(74, 24, 24, 0.05)'
                        : 'rgba(255, 255, 255, 0.05)'
                    }}>
                      <p className={`text-lg ${getTextClass()} opacity-60`}>No answers yet for this week</p>
                    </div>
                  )}

                  {/* Divider */}
                  {weekIndex < weeks.length - 1 && (
                    <div 
                      className="h-px my-12 opacity-20"
                      style={{
                        backgroundColor: mode === 'chaos' 
                          ? '#FFFFFF' 
                          : mode === 'chill'
                          ? '#4A1818'
                          : '#FFFFFF'
                      }}
                    />
                  )}
                </section>
              )
            })}
          </div>
        )}
          </div>
        </div>

        {/* Poll Dialog */}
        <Dialog open={isPollDialogOpen} onOpenChange={setIsPollDialogOpen}>
          <DialogContent 
            className={`${getRoundedClass('rounded-3xl')} max-w-4xl max-h-[90vh] overflow-y-auto`}
            style={{
              backgroundColor: mode === 'chaos' 
                ? '#1A1A1A' 
                : mode === 'chill'
                ? '#F5E6D3'
                : '#000000',
              border: `2px solid ${purpleColors.primary}40`
            }}
          >
            {selectedPoll && (
              <>
                <DialogHeader className="mb-6">
                  <DialogTitle className={`text-3xl font-black uppercase mb-2 ${getTextClass()}`}>
                    {selectedPoll.title}
                  </DialogTitle>
                  <p className={`text-sm ${getTextClass()} opacity-60`}>
                    {selectedPoll.askedBy ? `Asked by ${selectedPoll.askedBy} • ` : ''}{selectedPoll.date} • {selectedPoll.totalResponses} responses
                  </p>
                </DialogHeader>
                
                <div className="mb-6">
                  <h3 className={`text-xl font-black mb-4 ${getTextClass()}`}>
                    {selectedPoll.question}
                  </h3>
                  
                  {/* Ranking Poll Display - Movie Soundtracks */}
                  {selectedPoll.isRanking && selectedPoll.ranking && (
                    <div className="my-8">
                      <div className="space-y-3 mb-6">
                        {selectedPoll.ranking.map((item: any) => {
                          const maxRank = Math.min(...selectedPoll.ranking.map((r: any) => r.rank))
                          const percentage = ((selectedPoll.ranking.length - item.rank + 1) / selectedPoll.ranking.length) * 100
                          const isTopVoted = item.rank <= 5
                          
                          return (
                            <div key={item.rank} className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <span 
                                    className={`text-lg font-black ${getTextClass()}`}
                                    style={{ color: isTopVoted ? purpleColors.primary : undefined, minWidth: '2rem' }}
                                  >
                                    {item.rank}.
                                  </span>
                                  <span className={`text-base font-semibold ${getTextClass()}`}>
                                    {item.name}
                                  </span>
                                </div>
                                {isTopVoted && (
                                  <span 
                                    className="animated-emoji text-5xl"
                                    style={{ animationDelay: `${item.rank * 0.1}s` }}
                                  >
                                    {getPollItemEmoji(item.name)}
                                  </span>
                                )}
                              </div>
                              <div 
                                className={`${getRoundedClass('rounded-full')} h-4 overflow-hidden`}
                                style={{
                                  backgroundColor: mode === 'chaos' 
                                    ? 'rgba(255, 255, 255, 0.1)' 
                                    : mode === 'chill'
                                    ? 'rgba(74, 24, 24, 0.1)'
                                    : 'rgba(255, 255, 255, 0.1)'
                                }}
                              >
                                <div
                                  className="h-full transition-all duration-1000"
                                  style={{
                                    width: `${percentage}%`,
                                    backgroundColor: isTopVoted 
                                      ? purpleColors.primary
                                      : 'rgba(157, 78, 255, 0.4)'
                                  }}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      
                      <div className="mt-8 pt-8 border-t" style={{ borderColor: mode === 'chaos' ? 'rgba(255, 255, 255, 0.1)' : mode === 'chill' ? 'rgba(74, 24, 24, 0.1)' : 'rgba(255, 255, 255, 0.1)' }}>
                        <p className={`text-xl font-black mb-4 ${getTextClass()}`}>
                          Slouching Protagonists vs Significant Chairs
                        </p>
                        <div className="flex justify-center">
                          <img 
                            src="/venn_movies.png" 
                            alt="Venn diagram showing Slouching Protagonists vs Significant Chairs"
                            className="max-w-full h-auto"
                            style={{ maxHeight: '500px' }}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.style.display = 'none'
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Sandwich Poll Display */}
                  {selectedPoll.isSandwichPoll && selectedPoll.data && (
                    <div className="my-8">
                      {(() => {
                        const allData = selectedPoll.data.sort((a: any, b: any) => b.count - a.count)
                        const nonZeroData = allData.filter((item: any) => item.count > 0)
                        const zeroData = allData.filter((item: any) => item.count === 0)
                        const maxCount = Math.max(...nonZeroData.map((d: any) => d.count))
                        
                        return (
                          <>
                            {/* Positions by count */}
                            <div className="mb-8">
                              <h4 className={`text-2xl font-black mb-4 ${getTextClass()}`}>Positions by count</h4>
                              <div className="space-y-4">
                                {nonZeroData.map((item: any, index: number) => {
                                  const percentage = (item.count / maxCount) * 100
                                  const isTop = index === 0
                                  
                                  return (
                                    <div key={item.name} className="space-y-2">
                                      <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                          <span className={`text-lg font-black ${getTextClass()}`}>
                                            {item.name}
                                          </span>
                                          {item.participants && (
                                            <div className="mt-1">
                                              {item.participants.map((participant: string, pIdx: number) => (
                                                <span key={pIdx} className={`text-sm ${getTextClass()} opacity-70`}>
                                                  {participant}{pIdx < item.participants.length - 1 ? ', ' : ''}
                                                </span>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <span 
                                            className={`text-xl font-black ${getTextClass()}`}
                                            style={{ color: isTop ? purpleColors.primary : undefined }}
                                          >
                                            ({item.count} {item.count === 1 ? 'vote' : 'votes'})
                                          </span>
                                        </div>
                                      </div>
                                      <div 
                                        className={`${getRoundedClass('rounded-full')} h-4 overflow-hidden`}
                                        style={{
                                          backgroundColor: mode === 'chaos' 
                                            ? 'rgba(255, 255, 255, 0.1)' 
                                            : mode === 'chill'
                                            ? 'rgba(74, 24, 24, 0.1)'
                                            : 'rgba(255, 255, 255, 0.1)'
                                        }}
                                      >
                                        <div
                                          className="h-full transition-all duration-1000"
                                          style={{
                                            width: `${percentage}%`,
                                            backgroundColor: isTop 
                                              ? purpleColors.primary
                                              : 'rgba(157, 78, 255, 0.4)'
                                          }}
                                        />
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                              
                              {/* Zero count items */}
                              {zeroData.length > 0 && (
                                <div className="mt-6 pt-6 border-t" style={{ borderColor: mode === 'chaos' ? 'rgba(255, 255, 255, 0.1)' : mode === 'chill' ? 'rgba(74, 24, 24, 0.1)' : 'rgba(255, 255, 255, 0.1)' }}>
                                  {zeroData.map((item: any) => (
                                    <div key={item.name} className="mb-4">
                                      <span className={`text-lg font-black ${getTextClass()}`}>
                                        {item.name}
                                      </span>
                                      {item.note && (
                                        <span className={`text-sm ${getTextClass()} opacity-70 ml-2`}>
                                          ({item.note})
                                        </span>
                                      )}
                                      {item.participants && (
                                        <div className="mt-1">
                                          {item.participants.map((participant: string, pIdx: number) => (
                                            <span key={pIdx} className={`text-sm ${getTextClass()} opacity-70`}>
                                              {participant}{pIdx < item.participants.length - 1 ? ', ' : ''}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            
                            {/* Big Takeaway */}
                            {selectedPoll.bigTakeaway && (
                              <div className="mt-8 pt-8 border-t" style={{ borderColor: mode === 'chaos' ? 'rgba(255, 255, 255, 0.1)' : mode === 'chill' ? 'rgba(74, 24, 24, 0.1)' : 'rgba(255, 255, 255, 0.1)' }}>
                                <h4 className={`text-2xl font-black mb-4 ${getTextClass()}`}>
                                  {selectedPoll.bigTakeaway}
                                </h4>
                              </div>
                            )}
                            
                            {/* Emotional Geography Image */}
                            {selectedPoll.imageUrl && (
                              <div className="mt-8 pt-8 border-t" style={{ borderColor: mode === 'chaos' ? 'rgba(255, 255, 255, 0.1)' : mode === 'chill' ? 'rgba(74, 24, 24, 0.1)' : 'rgba(255, 255, 255, 0.1)' }}>
                                <div className="flex justify-center relative" style={{ maxHeight: '600px' }}>
                                  <img 
                                    src={selectedPoll.imageUrl} 
                                    alt="The Emotional Geography of Sandwiches"
                                    className="max-w-full h-auto"
                                    style={{ maxHeight: '600px', objectFit: 'contain' }}
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement
                                      target.style.display = 'none'
                                    }}
                                  />
                                </div>
                              </div>
                            )}
                          </>
                        )
                      })()}
                    </div>
                  )}
                  
                  {/* Count-based Poll Display - Thanksgiving */}
                  {!selectedPoll.isRanking && !selectedPoll.isShowsToBinge && !selectedPoll.isButtRock && !selectedPoll.isSandwichPoll && selectedPoll.data && (
                    <div className="my-8">
                      {(() => {
                        const allData = selectedPoll.data.sort((a: any, b: any) => b.count - a.count)
                        const nonZeroData = allData.filter((item: any) => item.count > 0)
                        const zeroData = allData.filter((item: any) => item.count === 0)
                        const maxCount = Math.max(...nonZeroData.map((d: any) => d.count))
                        
                        return (
                          <>
                            <div className="space-y-3 mb-6">
                              {nonZeroData.map((item: any, index: number) => {
                                const percentage = (item.count / maxCount) * 100
                                const isTop = index === 0
                                
                                return (
                                  <div key={item.name} className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                      <span className={`text-base font-semibold ${getTextClass()}`}>
                                        {item.name}
                                      </span>
                                      <div className="flex items-center gap-3">
                                        <span 
                                          className={`text-base font-black ${getTextClass()}`}
                                          style={{ color: isTop ? purpleColors.primary : undefined }}
                                        >
                                          {item.count}
                                        </span>
                                        {isTop && (
                                          <span 
                                            className="animated-emoji text-5xl"
                                          >
                                            {getPollItemEmoji(item.name)}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div 
                                      className={`${getRoundedClass('rounded-full')} h-4 overflow-hidden`}
                                      style={{
                                        backgroundColor: mode === 'chaos' 
                                          ? 'rgba(255, 255, 255, 0.1)' 
                                          : mode === 'chill'
                                          ? 'rgba(74, 24, 24, 0.1)'
                                          : 'rgba(255, 255, 255, 0.1)'
                                      }}
                                    >
                                      <div
                                        className="h-full transition-all duration-1000"
                                        style={{
                                          width: `${percentage}%`,
                                          backgroundColor: isTop 
                                            ? purpleColors.primary
                                            : 'rgba(157, 78, 255, 0.4)'
                                        }}
                                      />
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                            
                            {zeroData.length > 0 && (
                              <div className="mt-6 pt-6 border-t" style={{ borderColor: mode === 'chaos' ? 'rgba(255, 255, 255, 0.1)' : mode === 'chill' ? 'rgba(74, 24, 24, 0.1)' : 'rgba(255, 255, 255, 0.1)' }}>
                                <p className={`text-base font-black mb-3 ${getTextClass()}`}>
                                  And then there was one
                                </p>
                                <p className={`text-sm ${getTextClass()} opacity-70`}>
                                  {zeroData.map((item: any) => item.name).join(', ')}
                                </p>
                              </div>
                            )}
                            
                            <div className="mt-8 pt-8 border-t" style={{ borderColor: mode === 'chaos' ? 'rgba(255, 255, 255, 0.1)' : mode === 'chill' ? 'rgba(74, 24, 24, 0.1)' : 'rgba(255, 255, 255, 0.1)' }}>
                              <div className="flex justify-center">
                                <img 
                                  src="/thxgiving.png" 
                                  alt="Thanksgiving visualization"
                                  className="max-w-full h-auto"
                                  style={{ maxHeight: '500px' }}
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement
                                    target.style.display = 'none'
                                  }}
                                />
                              </div>
                            </div>
                          </>
                        )
                      })()}
                    </div>
                  )}
                  
                  {/* Shows to Binge Infographic Display */}
                  {selectedPoll.isShowsToBinge && selectedPoll.shows && (
                    <div className="my-8">
                      {(() => {
                        const shows = selectedPoll.shows
                        const maxSecrets = Math.max(...shows.map((s: any) => s.secretsPerSeason))
                        const maxGasps = Math.max(...shows.map((s: any) => s.gaspsPerMinute))
                        
                        return (
                          <div className="space-y-6">
                            <div className="grid grid-cols-3 gap-4 mb-8">
                              <div className={`${getRoundedClass('rounded-2xl')} p-4 text-center`}
                                style={{
                                  backgroundColor: mode === 'chaos' 
                                    ? 'rgba(157, 78, 255, 0.1)' 
                                    : mode === 'chill'
                                    ? 'rgba(157, 78, 255, 0.15)'
                                    : 'rgba(157, 78, 255, 0.1)',
                                  border: `1px solid ${purpleColors.primary}40`
                                }}
                              >
                                <Lock className="w-6 h-6 mx-auto mb-2" style={{ color: purpleColors.primary }} />
                                <p className={`text-xs uppercase tracking-wider ${getTextClass()} opacity-70 mb-1`}>Secrets</p>
                                <p className={`text-2xl font-black ${getTextClass()}`} style={{ color: purpleColors.primary }}>
                                  {maxSecrets}
                                </p>
                                <p className={`text-xs ${getTextClass()} opacity-60`}>per season (max)</p>
                              </div>
                              <div className={`${getRoundedClass('rounded-2xl')} p-4 text-center`}
                                style={{
                                  backgroundColor: mode === 'chaos' 
                                    ? 'rgba(157, 78, 255, 0.1)' 
                                    : mode === 'chill'
                                    ? 'rgba(157, 78, 255, 0.15)'
                                    : 'rgba(157, 78, 255, 0.1)',
                                  border: `1px solid ${purpleColors.primary}40`
                                }}
                              >
                                <span className="text-4xl mb-2 block">😱</span>
                                <p className={`text-xs uppercase tracking-wider ${getTextClass()} opacity-70 mb-1`}>Gasps</p>
                                <p className={`text-2xl font-black ${getTextClass()}`} style={{ color: purpleColors.primary }}>
                                  {maxGasps.toFixed(2)}
                                </p>
                                <p className={`text-xs ${getTextClass()} opacity-60`}>per minute (max)</p>
                              </div>
                              <div className={`${getRoundedClass('rounded-2xl')} p-4 text-center`}
                                style={{
                                  backgroundColor: mode === 'chaos' 
                                    ? 'rgba(157, 78, 255, 0.1)' 
                                    : mode === 'chill'
                                    ? 'rgba(157, 78, 255, 0.15)'
                                    : 'rgba(157, 78, 255, 0.1)',
                                  border: `1px solid ${purpleColors.primary}40`
                                }}
                              >
                                <TrendingUp className="w-6 h-6 mx-auto mb-2" style={{ color: purpleColors.primary }} />
                                <p className={`text-xs uppercase tracking-wider ${getTextClass()} opacity-70 mb-1`}>Change</p>
                                <p className={`text-2xl font-black ${getTextClass()}`} style={{ color: purpleColors.primary }}>
                                  81%
                                </p>
                                <p className={`text-xs ${getTextClass()} opacity-60`}>that change nothing (max)</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {shows.map((show: any, index: number) => {
                                const secretsPercentage = (show.secretsPerSeason / maxSecrets) * 100
                                const gaspsPercentage = (show.gaspsPerMinute / maxGasps) * 100
                                const isTopSecrets = show.secretsPerSeason === maxSecrets
                                const isTopGasps = show.gaspsPerMinute === maxGasps
                                
                                return (
                                  <div 
                                    key={show.name}
                                    className={`${getRoundedClass('rounded-2xl')} p-6 relative overflow-hidden`}
                                    style={{
                                      backgroundColor: mode === 'chaos' 
                                        ? 'rgba(255, 255, 255, 0.05)' 
                                        : mode === 'chill'
                                        ? 'rgba(74, 24, 24, 0.05)'
                                        : 'rgba(255, 255, 255, 0.05)',
                                      border: `2px solid ${isTopSecrets || isTopGasps ? purpleColors.primary : 'rgba(157, 78, 255, 0.2)'}`
                                    }}
                                  >
                                    <h4 className={`text-xl font-black mb-4 ${getTextClass()}`} style={{ 
                                      color: (isTopSecrets || isTopGasps) ? purpleColors.primary : undefined 
                                    }}>
                                      {show.name}
                                    </h4>

                                    <div className="mb-4">
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                          <Lock className="w-4 h-4" style={{ color: purpleColors.primary }} />
                                          <span className={`text-sm font-semibold ${getTextClass()}`}>Secrets per season</span>
                                        </div>
                                        <span className={`text-lg font-black ${getTextClass()}`} style={{ 
                                          color: isTopSecrets ? purpleColors.primary : undefined 
                                        }}>
                                          {show.secretsPerSeason}
                                        </span>
                                      </div>
                                      <div 
                                        className={`${getRoundedClass('rounded-full')} h-3 overflow-hidden relative`}
                                        style={{
                                          backgroundColor: mode === 'chaos' 
                                            ? 'rgba(255, 255, 255, 0.1)' 
                                            : mode === 'chill'
                                            ? 'rgba(74, 24, 24, 0.1)'
                                            : 'rgba(255, 255, 255, 0.1)'
                                        }}
                                      >
                                        <div
                                          className="h-full transition-all duration-1000"
                                          style={{
                                            width: `${secretsPercentage}%`,
                                            backgroundColor: isTopSecrets 
                                              ? purpleColors.primary
                                              : 'rgba(157, 78, 255, 0.5)'
                                          }}
                                        />
                                      </div>
                                    </div>

                                    <div className="mb-4">
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                          <span className="text-lg">😱</span>
                                          <span className={`text-sm font-semibold ${getTextClass()}`}>Gasps per minute</span>
                                        </div>
                                        <span className={`text-lg font-black ${getTextClass()}`} style={{ 
                                          color: isTopGasps ? purpleColors.primary : undefined 
                                        }}>
                                          {show.gaspsPerMinute.toFixed(2)}
                                        </span>
                                      </div>
                                      <div 
                                        className={`${getRoundedClass('rounded-full')} h-3 overflow-hidden relative`}
                                        style={{
                                          backgroundColor: mode === 'chaos' 
                                            ? 'rgba(255, 255, 255, 0.1)' 
                                            : mode === 'chill'
                                            ? 'rgba(74, 24, 24, 0.1)'
                                            : 'rgba(255, 255, 255, 0.1)'
                                        }}
                                      >
                                        <div
                                          className="h-full transition-all duration-1000"
                                          style={{
                                            width: `${gaspsPercentage}%`,
                                            backgroundColor: isTopGasps 
                                              ? purpleColors.primary
                                              : 'rgba(157, 78, 255, 0.5)'
                                          }}
                                        />
                                      </div>
                                    </div>

                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <Zap className="w-4 h-4" style={{ color: purpleColors.secondary }} />
                                        <span className={`text-sm font-semibold ${getTextClass()}`}>Change nothing</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <div 
                                          className="relative w-12 h-12"
                                          style={{
                                            background: `conic-gradient(${purpleColors.primary} ${show.percentChangeNothing * 3.6}deg, rgba(157, 78, 255, 0.2) ${show.percentChangeNothing * 3.6}deg)`,
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                          }}
                                        >
                                          <div 
                                            className="absolute inset-1 rounded-full"
                                            style={{
                                              backgroundColor: mode === 'chaos' 
                                                ? '#1A1A1A' 
                                                : mode === 'chill'
                                                ? '#F5E6D3'
                                                : '#000000'
                                            }}
                                          >
                                            <div className="h-full flex items-center justify-center">
                                              <span className={`text-xs font-black ${getTextClass()}`} style={{ color: purpleColors.primary }}>
                                                {show.percentChangeNothing}%
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  )}

                  {/* Butt Rock Edition Display */}
                  {selectedPoll.isButtRock && (
                    <div className="my-8 space-y-8">
                      <div>
                        <h4 className={`text-2xl font-black mb-4 ${getTextClass()}`}>
                          Top Songs by Number of Mentions
                        </h4>
                        <div className="space-y-3">
                          {selectedPoll.topSongs && selectedPoll.topSongs.map((song: any, index: number) => {
                            const maxCount = Math.max(...selectedPoll.topSongs.map((s: any) => s.count))
                            const percentage = (song.count / maxCount) * 100
                            const isTop = index === 0
                            
                            return (
                              <div key={`${song.name}-${song.artist}`} className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <span className={`text-base font-semibold ${getTextClass()}`}>
                                      {song.name}
                                    </span>
                                    <span className={`text-sm ${getTextClass()} opacity-70 ml-2`}>
                                      — {song.artist}
                                    </span>
                                  </div>
                                  <span 
                                    className={`text-base font-black ${getTextClass()}`}
                                    style={{ color: isTop ? purpleColors.primary : undefined }}
                                  >
                                    ({song.count})
                                  </span>
                                </div>
                                <div 
                                  className={`${getRoundedClass('rounded-full')} h-4 overflow-hidden`}
                                  style={{
                                    backgroundColor: mode === 'chaos' 
                                      ? 'rgba(255, 255, 255, 0.1)' 
                                      : mode === 'chill'
                                      ? 'rgba(74, 24, 24, 0.1)'
                                      : 'rgba(255, 255, 255, 0.1)'
                                  }}
                                >
                                  <div
                                    className="h-full transition-all duration-1000"
                                    style={{
                                      width: `${percentage}%`,
                                      backgroundColor: isTop 
                                        ? purpleColors.primary
                                        : 'rgba(157, 78, 255, 0.4)'
                                    }}
                                  />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {selectedPoll.singleMentionTracks && selectedPoll.singleMentionTracks.length > 0 && (
                        <div className="pt-6 border-t" style={{ borderColor: mode === 'chaos' ? 'rgba(255, 255, 255, 0.1)' : mode === 'chill' ? 'rgba(74, 24, 24, 0.1)' : 'rgba(255, 255, 255, 0.1)' }}>
                          <h4 className={`text-2xl font-black mb-4 ${getTextClass()}`}>
                            Single-Mention Tracks
                          </h4>
                          <div className="space-y-2">
                            {selectedPoll.singleMentionTracks.map((track: any) => (
                              <div key={`${track.name}-${track.artist}`} className={`text-base ${getTextClass()}`}>
                                <span className="font-semibold">{track.name}</span>
                                <span className={`opacity-70 ml-2`}>— {track.artist}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedPoll.artistFrequency && selectedPoll.artistFrequency.length > 0 && (
                        <div className="pt-6 border-t" style={{ borderColor: mode === 'chaos' ? 'rgba(255, 255, 255, 0.1)' : mode === 'chill' ? 'rgba(74, 24, 24, 0.1)' : 'rgba(255, 255, 255, 0.1)' }}>
                          <h4 className={`text-2xl font-black mb-4 ${getTextClass()}`}>
                            Artist Frequency
                          </h4>
                          <p className={`text-base ${getTextClass()} opacity-70 mb-2`}>
                            {selectedPoll.artistFrequency.join(', ')}
                          </p>
                          <p className={`text-sm ${getTextClass()} opacity-60 italic`}>
                            Each earns at least two separate mentions.
                          </p>
                          <p className={`text-sm ${getTextClass()} opacity-60 italic mt-2`}>
                            This gives a very tight "butt rock core seven."
                          </p>
                        </div>
                      )}

                      <div className="pt-8 border-t" style={{ borderColor: mode === 'chaos' ? 'rgba(255, 255, 255, 0.1)' : mode === 'chill' ? 'rgba(74, 24, 24, 0.1)' : 'rgba(255, 255, 255, 0.1)' }}>
                        <h4 className={`text-3xl font-black mb-6 ${getTextClass()}`} style={{ color: purpleColors.primary }}>
                          Butt Rock Perfect Storm Index
                        </h4>
                        
                        <p className={`text-lg ${getTextClass()} opacity-80 mb-8`}>
                          When you score each song by three traits:
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                          <div className={`${getRoundedClass('rounded-2xl')} p-6 text-center`}
                            style={{
                              backgroundColor: mode === 'chaos' 
                                ? 'rgba(157, 78, 255, 0.1)' 
                                : mode === 'chill'
                                ? 'rgba(157, 78, 255, 0.15)'
                                : 'rgba(157, 78, 255, 0.1)',
                              border: `2px solid ${purpleColors.primary}40`
                            }}
                          >
                            <span className="text-4xl mb-3 block">🎤</span>
                            <p className={`text-sm font-black uppercase tracking-wider ${getTextClass()} mb-2`}>
                              Growly male vocal
                            </p>
                          </div>
                          <div className={`${getRoundedClass('rounded-2xl')} p-6 text-center`}
                            style={{
                              backgroundColor: mode === 'chaos' 
                                ? 'rgba(157, 78, 255, 0.1)' 
                                : mode === 'chill'
                                ? 'rgba(157, 78, 255, 0.15)'
                                : 'rgba(157, 78, 255, 0.1)',
                              border: `2px solid ${purpleColors.primary}40`
                            }}
                          >
                            <span className="text-4xl mb-3 block">💭</span>
                            <p className={`text-sm font-black uppercase tracking-wider ${getTextClass()} mb-2`}>
                              One-word emotional noun in the chorus
                            </p>
                          </div>
                          <div className={`${getRoundedClass('rounded-2xl')} p-6 text-center`}
                            style={{
                              backgroundColor: mode === 'chaos' 
                                ? 'rgba(157, 78, 255, 0.1)' 
                                : mode === 'chill'
                                ? 'rgba(157, 78, 255, 0.15)'
                                : 'rgba(157, 78, 255, 0.1)',
                              border: `2px solid ${purpleColors.primary}40`
                            }}
                          >
                            <span className="text-4xl mb-3 block">🏭</span>
                            <p className={`text-sm font-black uppercase tracking-wider ${getTextClass()} mb-2`}>
                              Music video set in warehouse, pit, or parking lot
                            </p>
                          </div>
                        </div>

                        <p className={`text-lg ${getTextClass()} opacity-80 mb-8`}>
                          You get this:
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                          <div className={`${getRoundedClass('rounded-2xl')} p-6`}
                            style={{
                              backgroundColor: mode === 'chaos' 
                                ? 'rgba(157, 78, 255, 0.15)' 
                                : mode === 'chill'
                                ? 'rgba(157, 78, 255, 0.2)'
                                : 'rgba(157, 78, 255, 0.15)',
                              border: `2px solid ${purpleColors.primary}`
                            }}
                          >
                            <div className="flex items-center justify-center mb-4">
                              <div 
                                className="relative w-24 h-24"
                                style={{
                                  background: `conic-gradient(${purpleColors.primary} 360deg, rgba(157, 78, 255, 0.2) 360deg)`,
                                  borderRadius: '50%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                              >
                                <div 
                                  className="absolute inset-2 rounded-full"
                                  style={{
                                    backgroundColor: mode === 'chaos' 
                                      ? '#1A1A1A' 
                                      : mode === 'chill'
                                      ? '#F5E6D3'
                                      : '#000000'
                                  }}
                                >
                                  <div className="h-full flex items-center justify-center">
                                    <span className={`text-3xl font-black ${getTextClass()}`} style={{ color: purpleColors.primary }}>
                                      100%
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <p className={`text-base ${getTextClass()} text-center font-semibold`}>
                              of the group's top-vote songs check at least two boxes
                            </p>
                          </div>

                          <div className={`${getRoundedClass('rounded-2xl')} p-6`}
                            style={{
                              backgroundColor: mode === 'chaos' 
                                ? 'rgba(157, 78, 255, 0.15)' 
                                : mode === 'chill'
                                ? 'rgba(157, 78, 255, 0.2)'
                                : 'rgba(157, 78, 255, 0.15)',
                              border: `2px solid ${purpleColors.primary}`
                            }}
                          >
                            <div className="flex items-center justify-center mb-4">
                              <div 
                                className="relative w-24 h-24"
                                style={{
                                  background: `conic-gradient(${purpleColors.primary} ${71 * 3.6}deg, rgba(157, 78, 255, 0.2) ${71 * 3.6}deg)`,
                                  borderRadius: '50%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                              >
                                <div 
                                  className="absolute inset-2 rounded-full"
                                  style={{
                                    backgroundColor: mode === 'chaos' 
                                      ? '#1A1A1A' 
                                      : mode === 'chill'
                                      ? '#F5E6D3'
                                      : '#000000'
                                  }}
                                >
                                  <div className="h-full flex items-center justify-center">
                                    <span className={`text-3xl font-black ${getTextClass()}`} style={{ color: purpleColors.primary }}>
                                      71%
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <p className={`text-base ${getTextClass()} text-center font-semibold`}>
                              check all three
                            </p>
                          </div>
                        </div>

                        <div className={`${getRoundedClass('rounded-2xl')} p-6`}
                          style={{
                            backgroundColor: mode === 'chaos' 
                              ? 'rgba(255, 255, 255, 0.05)' 
                              : mode === 'chill'
                              ? 'rgba(74, 24, 24, 0.05)'
                              : 'rgba(255, 255, 255, 0.05)',
                            border: `2px solid ${purpleColors.secondary}60`
                          }}
                        >
                          <div className="flex items-start gap-4">
                            <span className="text-4xl">✨</span>
                            <div className="flex-1">
                              <p className={`text-base font-black ${getTextClass()} mb-2`}>
                                The only outlier is <span style={{ color: purpleColors.secondary }}>Butterfly by Crazy Town</span>
                              </p>
                              <p className={`text-sm ${getTextClass()} opacity-70 italic`}>
                                which swaps "warehouse angst" for "shirtless fairy energy."
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        <Footer />
      </main>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
