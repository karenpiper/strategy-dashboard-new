'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useMode } from '@/contexts/mode-context'
import { useAuth } from '@/contexts/auth-context'
import { Lock, ArrowRight, CheckCircle, Users, TrendingUp, TrendingDown, Minus, Calendar, Target, Briefcase, Heart, Zap, ChevronUp, ChevronDown } from 'lucide-react'

interface PulseQuestion {
  question_key: string
  question_text: string
}

interface PulseResponse {
  questionKey: string
  score: number
  comment?: string
}

interface AggregatedData {
  questionKey: string
  questionText?: string
  average: number
  responseCount: number
  commentThemes: { theme: string; count: number }[]
  change?: number | null
  prevAverage?: number | null
}

interface QuestionSummary {
  questionKey: string
  questionText?: string
  average: number
}

const FIXED_HEIGHT = '' // Removed fixed height to allow natural sizing

// Question icons mapping
const QUESTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  week: Calendar,
  priorities: Target,
  workload: Briefcase,
  support: Heart,
  energy: Zap,
  collaboration: Users,
  feedback: TrendingUp,
  balance: Heart,
  growth: TrendingUp,
  satisfaction: CheckCircle,
}

// Score interpretation helper
const getScoreInterpretation = (score: number) => {
  if (score >= 70) {
    return { 
      label: 'Great!', 
      emoji: '🎉', 
      color: 'text-green-700',
      bgColor: 'bg-green-100',
      borderColor: 'border-green-300',
      tintBg: 'bg-green-50/80'
    }
  } else if (score >= 50) {
    return { 
      label: 'Good', 
      emoji: '👍', 
      color: 'text-yellow-700',
      bgColor: 'bg-yellow-100',
      borderColor: 'border-yellow-300',
      tintBg: 'bg-yellow-50/80'
    }
  } else {
    return { 
      label: 'Needs attention', 
      emoji: '⚠️', 
      color: 'text-red-700',
      bgColor: 'bg-red-100',
      borderColor: 'border-red-300',
      tintBg: 'bg-red-50/80'
    }
  }
}

// Get slider color based on score
const getSliderColor = (score: number) => {
  if (score >= 70) {
    return 'linear-gradient(90deg, #10b981 0%, #059669 100%)'
  } else if (score >= 50) {
    return 'linear-gradient(90deg, #eab308 0%, #ca8a04 100%)'
  } else {
    return 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)'
  }
}

// Get icon for question
const getQuestionIcon = (questionKey: string) => {
  return QUESTION_ICONS[questionKey] || TrendingUp
}

export function TeamPulseCard() {
  const { mode } = useMode()
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState<'survey' | 'results'>('survey')
  const [questions, setQuestions] = useState<PulseQuestion[]>([])
  const [responses, setResponses] = useState<Record<string, PulseResponse>>({})
  const [comments, setComments] = useState<Record<string, string>>({})
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [aggregatedData, setAggregatedData] = useState<AggregatedData[]>([])
  const [totalResponses, setTotalResponses] = useState(0)
  const [overallTeamMood, setOverallTeamMood] = useState<number>(0)
  const [highestQuestion, setHighestQuestion] = useState<QuestionSummary | null>(null)
  const [lowestQuestion, setLowestQuestion] = useState<QuestionSummary | null>(null)

  // Load 2 random questions on mount - always get fresh questions
  useEffect(() => {
    async function loadQuestions() {
      try {
        // Add cache-busting to ensure fresh questions each time
        const response = await fetch(`/api/team-pulse/questions?t=${Date.now()}`)
        if (response.ok) {
          const data = await response.json()
          setQuestions(data.questions || [])
          // Initialize responses with default score of 50
          const initialResponses: Record<string, PulseResponse> = {}
          data.questions?.forEach((q: PulseQuestion) => {
            initialResponses[q.question_key] = {
              questionKey: q.question_key,
              score: 50,
            }
          })
          setResponses(initialResponses)
        }
      } catch (error) {
        console.error('Error loading questions:', error)
      }
    }
    loadQuestions()
  }, [])

  // Check if user has already submitted this week (but don't auto-switch to results)
  useEffect(() => {
    async function checkSubmission() {
      if (!user) return
      try {
        const response = await fetch('/api/team-pulse/check-submission')
        if (response.ok) {
          const data = await response.json()
          setHasSubmitted(data.hasSubmitted)
          // Always show questions, even if already submitted
          // User can view results by clicking a button if needed
        }
      } catch (error) {
        console.error('Error checking submission:', error)
      }
    }
    checkSubmission()
  }, [user])

  // Load aggregated data
  const loadAggregatedData = async () => {
    try {
      const response = await fetch('/api/team-pulse/aggregated')
      if (response.ok) {
        const data = await response.json()
        setAggregatedData(data.aggregatedData || [])
        setTotalResponses(data.totalResponses || 0)
        setOverallTeamMood(data.overallTeamMood || 0)
        setHighestQuestion(data.highestQuestion || null)
        setLowestQuestion(data.lowestQuestion || null)
      }
    } catch (error) {
      console.error('Error loading aggregated data:', error)
    }
  }

  const handleScoreChange = (questionKey: string, value: number[]) => {
    setResponses({
      ...responses,
      [questionKey]: {
        ...responses[questionKey],
        questionKey,
        score: value[0],
      },
    })
  }

  const handleCommentChange = (questionKey: string, value: string) => {
    setComments({
      ...comments,
      [questionKey]: value,
    })
  }

  const handleSubmit = async () => {
    if (!user || isSubmitting) return
    
    // Validate both questions have scores
    const allAnswered = questions.every(q => responses[q.question_key]?.score !== undefined)
    if (!allAnswered) {
      console.error('Not all questions answered')
      return
    }

    setIsSubmitting(true)
    
    try {
      // Prepare responses with comments
      const responseData = questions.map(q => {
        const score = responses[q.question_key]?.score
        if (score === undefined || score === null) {
          throw new Error(`Missing score for question: ${q.question_key}`)
        }
        return {
          questionKey: q.question_key,
          score: Number(score),
          comment: comments[q.question_key]?.trim() || undefined,
        }
      })

      console.log('Submitting responses:', responseData)

      const response = await fetch('/api/team-pulse/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses: responseData }),
      })

      const data = await response.json()

      if (response.ok) {
        setHasSubmitted(true)
        await loadAggregatedData()
        setCurrentStep('results')
      } else {
        console.error('Submit failed:', data)
        alert(`Failed to submit: ${data.error || 'Unknown error'}. ${data.details || ''}`)
      }
    } catch (error) {
      console.error('Error submitting pulse:', error)
      alert(`Error submitting: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getRoundedClass = (base: string) => {
    if (mode === 'chaos') return base.replace('rounded', 'rounded-[1.5rem]')
    if (mode === 'chill') return base.replace('rounded', 'rounded-2xl')
    return base
  }

  const style = mode === 'chaos' 
    ? { bg: 'bg-white', border: 'border-0', text: 'text-black', accent: '#00FF87' }
    : mode === 'chill'
    ? { bg: 'bg-white', border: 'border-0', text: 'text-[#4A1818]', accent: '#C8D961' }
    : { bg: 'bg-black', border: 'border-0', text: 'text-white', accent: '#ffffff' }

  const barColor = mode === 'chaos' ? '#00FF87' : mode === 'chill' ? '#C8D961' : '#ffffff'
  const trackBg = mode === 'chaos' ? 'rgba(0, 0, 0, 0.1)' : mode === 'chill' ? 'rgba(74, 24, 24, 0.1)' : 'rgba(255, 255, 255, 0.2)'
  const thumbBorder = mode === 'chaos' ? '#000' : mode === 'chill' ? '#4A1818' : '#fff'

  // Show results if submitted
  if (currentStep === 'results' && hasSubmitted) {
    const overallInterpretation = getScoreInterpretation(overallTeamMood)
    
    return (
      <Card className={`${style.bg} ${style.border} !rounded-[2.5rem] flex flex-col overflow-hidden relative`}>
        {/* Subtle gradient background based on overall mood */}
        <div 
          className="absolute inset-0 opacity-5 pointer-events-none transition-opacity duration-1000"
          style={{
            background: overallTeamMood >= 70 
              ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
              : overallTeamMood >= 50
              ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
              : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
          }}
        />
        
        <div className="p-4 pb-3 flex-shrink-0 relative z-10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg ${mode === 'chaos' ? 'bg-[#00FF87]/20' : mode === 'chill' ? 'bg-[#C8D961]/20' : 'bg-white/20'}`}>
                <TrendingUp className={`w-4 h-4 ${style.text}`} />
              </div>
              <div>
                <h2 className={`text-xl font-black uppercase ${style.text} tracking-tighter`}>Team Pulse</h2>
                <p className={`text-xs font-bold ${style.text}/70 mt-0.5 uppercase tracking-wider`}>This week's results</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={`${mode === 'chaos' ? 'bg-[#00FF87] text-black' : mode === 'chill' ? 'bg-[#C8D961] text-[#4A1818]' : 'bg-white text-black'} border-0 font-black text-xs px-2 py-0.5`}>
                {totalResponses} {totalResponses === 1 ? 'response' : 'responses'}
              </Badge>
              <Button
                onClick={() => {
                  // Reload questions to get fresh ones
                  fetch(`/api/team-pulse/questions?t=${Date.now()}`)
                    .then(res => res.json())
                    .then(data => {
                      setQuestions(data.questions || [])
                      const initialResponses: Record<string, PulseResponse> = {}
                      data.questions?.forEach((q: PulseQuestion) => {
                        initialResponses[q.question_key] = {
                          questionKey: q.question_key,
                          score: 50,
                        }
                      })
                      setResponses(initialResponses)
                      setComments({})
                      setCurrentStep('survey')
                    })
                    .catch(err => console.error('Error loading questions:', err))
                }}
                variant="outline"
                className={`${getRoundedClass('rounded-lg')} text-xs h-7 px-3 ${
                  mode === 'chaos' 
                    ? 'bg-black/10 border-black/20 text-black hover:bg-black/20' 
                    : mode === 'chill'
                    ? 'bg-[#4A1818]/10 border-[#4A1818]/20 text-[#4A1818] hover:bg-[#4A1818]/20'
                    : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                }`}
              >
                New Questions
              </Button>
            </div>
          </div>
        </div>
        
        <div className="flex-1 px-4 pb-4 relative z-10">
          <div className="space-y-2">
            {aggregatedData.length > 0 ? (
              aggregatedData.map((data, index) => {
                const question = questions.find(q => q.question_key === data.questionKey)
                const questionText = question?.question_text || data.questionText || data.questionKey
                const QuestionIcon = getQuestionIcon(data.questionKey)
                const interpretation = getScoreInterpretation(data.average)
                const roundedAverage = Math.round(data.average)
                
                const resultTint = interpretation.tintBg
                
                return (
                  <div 
                    key={data.questionKey} 
                    className={`p-2 rounded-lg border-2 ${interpretation.borderColor} ${resultTint} transition-all duration-300 backdrop-blur-sm`}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className={`p-1 rounded-md ${interpretation.bgColor} flex-shrink-0`}>
                          <QuestionIcon className={`w-3 h-3 ${interpretation.color}`} />
                        </div>
                        <p className={`text-xs font-black ${interpretation.color} leading-tight truncate`}>{questionText}</p>
                      </div>
                      <div className="flex items-baseline gap-1 flex-shrink-0">
                        <span className={`text-lg font-black ${interpretation.color}`}>{roundedAverage}</span>
                        <span className={`text-xs font-bold ${interpretation.color}/70`}>/100</span>
                        <span className="text-sm ml-1" title={interpretation.label}>{interpretation.emoji}</span>
                      </div>
                    </div>
                    <div className={`w-full rounded-full h-2 ${mode === 'chaos' ? 'bg-black/10' : mode === 'chill' ? 'bg-[#4A1818]/10' : 'bg-white/20'} overflow-hidden shadow-inner`}>
                      <div 
                        className="h-2 rounded-full transition-all duration-700 ease-out shadow-lg" 
                        style={{ 
                          width: `${data.average}%`, 
                          background: getSliderColor(data.average)
                        }} 
                      />
                    </div>
                  </div>
                )
              })
            ) : (
              <div className={`text-center py-6 ${style.text}/70`}>
                <Users className={`w-10 h-10 mx-auto mb-3 ${style.text}/40`} />
                <p className="text-sm font-black uppercase tracking-wider mb-1">No data yet</p>
                <p className="text-xs font-bold">Results will appear here once responses are submitted.</p>
              </div>
            )}
          </div>
        </div>

      </Card>
    )
  }

  // Show survey
  if (questions.length === 0) {
    return (
      <Card className={`${style.bg} ${style.border} !rounded-[2.5rem] flex items-center justify-center`}>
        <div className={`text-center ${style.text}/70`}>
          <p className="text-base font-black uppercase tracking-wider">Loading questions...</p>
        </div>
      </Card>
    )
  }

  const allAnswered = questions.every(q => responses[q.question_key]?.score !== undefined)

  return (
    <>
      <style>{`
        .pulse-slider-wrapper [class*="bg-secondary"],
        .pulse-slider-wrapper [class*="rounded-full"][class*="bg-"]:first-child {
          background: linear-gradient(90deg, ${trackBg} 0%, ${trackBg} 100%) !important;
          height: 16px !important;
          border-radius: 12px !important;
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1) !important;
        }
        .pulse-slider-wrapper [class*="bg-primary"],
        .pulse-slider-wrapper [class*="absolute"][class*="h-full"] {
          background: var(--slider-gradient) !important;
          height: 16px !important;
          border-radius: 12px !important;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15) !important;
        }
        .pulse-slider-wrapper button,
        .pulse-slider-wrapper [role="slider"] {
          background: var(--slider-gradient) !important;
          border-color: ${mode === 'chaos' ? '#000' : mode === 'chill' ? '#4A1818' : '#fff'} !important;
          height: 32px !important;
          width: 32px !important;
          border-width: 5px !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2), 0 0 0 2px ${mode === 'chaos' ? 'rgba(255,255,255,0.3)' : mode === 'chill' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)'} !important;
          transition: all 0.2s ease !important;
        }
        .pulse-slider-wrapper button:hover,
        .pulse-slider-wrapper [role="slider"]:hover {
          transform: scale(1.1) !important;
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3), 0 0 0 3px ${mode === 'chaos' ? 'rgba(255,255,255,0.4)' : mode === 'chill' ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.2)'} !important;
        }
      `}</style>
      <Card className={`${style.bg} ${style.border} !rounded-[2.5rem] flex flex-col overflow-hidden`}>
        <div className="p-6 pb-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Lock className={`w-3 h-3 ${style.text}/60`} />
              <p className={`text-xs ${style.text}/60`}>Your response is private and only added to the group average</p>
            </div>
            {hasSubmitted && (
              <Button
                onClick={() => {
                  loadAggregatedData()
                  setCurrentStep('results')
                }}
                variant="outline"
                className={`${getRoundedClass('rounded-lg')} text-xs h-8 px-4 ${
                  mode === 'chaos' 
                    ? 'bg-black/10 border-black/20 text-black hover:bg-black/20' 
                    : mode === 'chill'
                    ? 'bg-[#4A1818]/10 border-[#4A1818]/20 text-[#4A1818] hover:bg-[#4A1818]/20'
                    : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                }`}
              >
                View Results
              </Button>
            )}
          </div>
          
          {/* Header matching section header style */}
          <p className={`text-xs uppercase tracking-widest font-black mb-6 flex items-center gap-2 ${mode === 'chaos' ? 'text-[#666666]' : mode === 'chill' ? 'text-[#8B4444]' : mode === 'code' ? 'text-[#808080] font-mono' : 'text-[#808080]'}`}>
            {mode === 'code' ? (
              <>
                <span className="text-[#FFFFFF]">════════════════════════════════════════</span>
                <span className="text-[#808080]">TEAM PULSE</span>
                <span className="text-[#FFFFFF]">════════════════════════════════════════</span>
              </>
            ) : (
              <>
                <span className={`w-8 h-px ${mode === 'chaos' ? 'bg-[#333333]' : mode === 'chill' ? 'bg-[#8B4444]/30' : 'bg-[#333333]'}`}></span>
                Team Pulse
              </>
            )}
          </p>
          
          {hasSubmitted && (
            <div className={`mb-4 p-2 ${getRoundedClass('rounded-lg')} ${
              mode === 'chaos' 
                ? 'bg-[#EAB308]/10 border border-[#EAB308]/20' 
                : mode === 'chill'
                ? 'bg-[#FFC043]/10 border border-[#FFC043]/20'
                : 'bg-white/10 border border-white/20'
            }`}>
              <p className={`text-xs ${style.text}/80`}>
                You've already submitted this week. You can answer again to see new questions, but your previous submission won't be overwritten.
              </p>
            </div>
          )}
        </div>
        
        <div className="flex-1 px-6 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {questions.map((question, index) => {
              const response = responses[question.question_key]
              const score = response?.score ?? 50
              const comment = comments[question.question_key] || ''

              const scoreInterpretation = getScoreInterpretation(score)
              
              return (
                <div key={question.question_key} className="space-y-2">
                  <p className={`text-sm font-black ${style.text} leading-tight`}>
                    {question.question_text}
                  </p>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      <span 
                        className={`text-2xl font-black ${scoreInterpretation.color}`}
                      >
                        {score}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div 
                        className="pulse-slider-wrapper"
                        data-score={score}
                        style={{
                          '--slider-gradient': getSliderColor(score)
                        } as React.CSSProperties}
                      >
                        <Slider
                          value={[score]}
                          onValueChange={(value) => handleScoreChange(question.question_key, value)}
                          min={0}
                          max={100}
                          step={1}
                          className="w-full"
                        />
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className={`text-[10px] font-black ${style.text}/70 uppercase tracking-wider`}>Low</span>
                        <span className={`text-[10px] font-black ${style.text}/70 uppercase tracking-wider`}>High</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Optional comment */}
                  <div>
                    <label className={`text-[10px] font-black mb-1 block ${style.text} uppercase tracking-wider`}>
                      Comment
                    </label>
                    <Textarea
                      value={comment}
                      onChange={(e) => handleCommentChange(question.question_key, e.target.value)}
                      placeholder="Share your thoughts..."
                      className={`${getRoundedClass('rounded-lg')} min-h-[40px] resize-none font-medium text-xs p-2 ${
                        mode === 'chaos' 
                          ? 'bg-white border-2 border-black/30 text-black placeholder:text-black/50 focus:border-black/50 focus:ring-2 focus:ring-black/20' 
                          : mode === 'chill' 
                          ? 'bg-white border-2 border-[#4A1818]/30 text-[#4A1818] placeholder:text-[#4A1818]/50 focus:border-[#4A1818]/50 focus:ring-2 focus:ring-[#4A1818]/20' 
                          : 'bg-white/10 border-2 border-white/30 text-white placeholder:text-white/50 focus:border-white/50 focus:ring-2 focus:ring-white/20'
                      }`}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        
        <div className="p-6 pt-4 flex-shrink-0 border-t border-opacity-10" style={{ borderColor: mode === 'chaos' ? 'rgba(0,0,0,0.1)' : mode === 'chill' ? 'rgba(74,24,24,0.1)' : 'rgba(255,255,255,0.1)' }}>
          <Button
            onClick={handleSubmit}
            disabled={!allAnswered || isSubmitting}
            className={`w-full ${getRoundedClass('rounded-lg')} h-10 ${
              mode === 'chaos' ? 'bg-[#00FF87] text-black hover:bg-[#00FF87]/80' :
              mode === 'chill' ? 'bg-[#C8D961] text-[#4A1818] hover:bg-[#C8D961]/80' :
              'bg-white text-black hover:bg-white/80'
            } font-black uppercase tracking-wider text-sm ${mode === 'code' ? 'font-mono' : ''} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
            {!isSubmitting && <ArrowRight className="w-4 h-4 ml-2" />}
          </Button>
        </div>
      </Card>
    </>
  )
}
