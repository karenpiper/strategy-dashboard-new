'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { useMode } from '@/contexts/mode-context'
import { SiteHeader } from '@/components/site-header'
import { Footer } from '@/components/footer'
import { ArrowLeft, Users, MessageCircle, Calendar, Quote } from 'lucide-react'
import Link from 'next/link'

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

  if (loading || !user) {
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
      <SiteHeader />

      <main className="max-w-[1400px] mx-auto px-6 py-10 flex-1 pt-24">
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

        {weeks.length === 0 ? (
          <div className="text-center py-20">
            <p className={`text-lg ${getTextClass()} opacity-60`}>No poll data available yet</p>
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
