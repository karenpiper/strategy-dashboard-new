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

const FIXED_HEIGHT = 'h-[600px]'

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
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    }
  } else if (score >= 50) {
    return { 
      label: 'Good', 
      emoji: '👍', 
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    }
  } else {
    return { 
      label: 'Needs attention', 
      emoji: '⚠️', 
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200'
    }
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
      <Card className={`${style.bg} ${style.border} !rounded-[2.5rem] ${FIXED_HEIGHT} flex flex-col overflow-hidden relative`}>
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
        
        <div className="p-8 pb-6 flex-shrink-0 relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${mode === 'chaos' ? 'bg-[#00FF87]/20' : mode === 'chill' ? 'bg-[#C8D961]/20' : 'bg-white/20'}`}>
                <TrendingUp className={`w-5 h-5 ${style.text}`} />
              </div>
              <div>
                <h2 className={`text-2xl font-black uppercase ${style.text}`}>Team Pulse</h2>
                <p className={`text-xs ${style.text}/60 mt-1`}>This week's results</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge className={`${mode === 'chaos' ? 'bg-[#00FF87] text-black' : mode === 'chill' ? 'bg-[#C8D961] text-[#4A1818]' : 'bg-white text-black'} border-0 font-black text-xs px-3 py-1`}>
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
                className={`${getRoundedClass('rounded-lg')} text-xs h-8 px-4 ${
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

          {/* Overall Team Mood Summary */}
          {overallTeamMood > 0 && (
            <div className={`mb-6 p-4 rounded-xl border-2 ${overallInterpretation.borderColor} ${overallInterpretation.bgColor} transition-all duration-500`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{overallInterpretation.emoji}</span>
                  <div>
                    <p className={`text-xs font-medium ${overallInterpretation.color} mb-1`}>Team Health</p>
                    <div className="flex items-baseline gap-2">
                      <span className={`text-3xl font-black ${overallInterpretation.color}`}>{overallTeamMood}</span>
                      <span className={`text-sm ${overallInterpretation.color}/60`}>/100</span>
                      <span className={`text-sm font-bold ${overallInterpretation.color} ml-2`}>{overallInterpretation.label}</span>
                    </div>
                  </div>
                </div>
                {(highestQuestion || lowestQuestion) && (
                  <div className="text-right">
                    {highestQuestion && (
                      <p className={`text-xs ${style.text}/60 mb-1`}>
                        <span className="font-medium">↑ Highest:</span> {highestQuestion.average}
                      </p>
                    )}
                    {lowestQuestion && (
                      <p className={`text-xs ${style.text}/60`}>
                        <span className="font-medium">↓ Lowest:</span> {lowestQuestion.average}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto px-8 pb-8 relative z-10">
          <div className="space-y-6">
            {aggregatedData.length > 0 ? (
              aggregatedData.map((data, index) => {
                const question = questions.find(q => q.question_key === data.questionKey)
                const questionText = question?.question_text || data.questionText || data.questionKey
                const QuestionIcon = getQuestionIcon(data.questionKey)
                const interpretation = getScoreInterpretation(data.average)
                const roundedAverage = Math.round(data.average)
                
                return (
                  <div 
                    key={data.questionKey} 
                    className="space-y-3 transition-all duration-300"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`p-2 rounded-lg ${mode === 'chaos' ? 'bg-black/5' : mode === 'chill' ? 'bg-[#4A1818]/5' : 'bg-white/10'} mt-0.5`}>
                          <QuestionIcon className={`w-4 h-4 ${style.text}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-bold ${style.text} leading-tight mb-1`}>{questionText}</p>
                          {data.change !== null && data.change !== undefined && (
                            <div className="flex items-center gap-1.5">
                              {data.change > 0 ? (
                                <ChevronUp className={`w-3 h-3 text-green-600`} />
                              ) : data.change < 0 ? (
                                <ChevronDown className={`w-3 h-3 text-red-600`} />
                              ) : (
                                <Minus className={`w-3 h-3 ${style.text}/40`} />
                              )}
                              <span className={`text-xs font-medium ${
                                data.change > 0 ? 'text-green-600' : data.change < 0 ? 'text-red-600' : style.text + '/60'
                              }`}>
                                {data.change > 0 ? '+' : ''}{data.change} from last week
                                {data.prevAverage !== null && data.prevAverage !== undefined && (
                                  <span className={`${style.text}/40 ml-1`}>(was {data.prevAverage})</span>
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-baseline gap-2 flex-shrink-0">
                        <span className={`text-3xl font-black ${style.text}`}>{roundedAverage}</span>
                        <span className={`text-xs ${style.text}/60`}>/100</span>
                        <span className="text-lg ml-1" title={interpretation.label}>{interpretation.emoji}</span>
                      </div>
                    </div>
                    <div className={`w-full rounded-full h-3 ${mode === 'chaos' ? 'bg-black/10' : mode === 'chill' ? 'bg-[#4A1818]/10' : 'bg-white/20'} overflow-hidden`}>
                      <div 
                        className="h-3 rounded-full transition-all duration-700 ease-out" 
                        style={{ 
                          width: `${data.average}%`, 
                          backgroundColor: barColor
                        }} 
                      />
                    </div>
                    {data.commentThemes.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {data.commentThemes.map((theme, idx) => (
                          <Badge
                            key={idx}
                            className={`text-xs font-medium transition-all hover:scale-105 ${mode === 'chaos' ? 'bg-black/10 text-black border border-black/20' : mode === 'chill' ? 'bg-[#4A1818]/10 text-[#4A1818] border border-[#4A1818]/20' : 'bg-white/10 text-white border border-white/20'}`}
                          >
                            {theme.theme} ({theme.count})
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })
            ) : (
              <div className={`text-center py-12 ${style.text}/70`}>
                <Users className={`w-12 h-12 mx-auto mb-4 ${style.text}/40`} />
                <p className="text-sm">No data yet</p>
                <p className="text-xs mt-2">Results will appear here once responses are submitted.</p>
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
      <Card className={`${style.bg} ${style.border} !rounded-[2.5rem] ${FIXED_HEIGHT} flex items-center justify-center`}>
        <div className={`text-center ${style.text}/60`}>
          <p className="text-sm">Loading questions...</p>
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
          background-color: ${trackBg} !important;
          height: 12px !important;
        }
        .pulse-slider-wrapper [class*="bg-primary"],
        .pulse-slider-wrapper [class*="absolute"][class*="h-full"] {
          background-color: ${barColor} !important;
          height: 12px !important;
        }
        .pulse-slider-wrapper button,
        .pulse-slider-wrapper [role="slider"] {
          background-color: ${barColor} !important;
          border-color: ${thumbBorder} !important;
          height: 24px !important;
          width: 24px !important;
          border-width: 4px !important;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
        }
      `}</style>
      <Card className={`${style.bg} ${style.border} !rounded-[2.5rem] ${FIXED_HEIGHT} flex flex-col overflow-hidden`}>
        <div className="p-8 pb-6 flex-shrink-0">
          <div className="flex items-center justify-between mb-6">
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
          
          <h2 className={`text-2xl font-black mb-6 uppercase ${style.text}`}>Team Pulse</h2>
          {hasSubmitted && (
            <div className={`mb-4 p-3 ${getRoundedClass('rounded-lg')} ${
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
        
        <div className="flex-1 overflow-y-auto px-8 pb-6">
          <div className="space-y-8">
            {questions.map((question, index) => {
              const response = responses[question.question_key]
              const score = response?.score ?? 50
              const comment = comments[question.question_key] || ''

              return (
                <div key={question.question_key} className="space-y-4">
                  <div>
                    <p className={`text-lg font-medium mb-6 text-center ${style.text}`}>
                      {question.question_text}
                    </p>
                    <div className="px-2">
                      <div className="mb-4">
                        <div className={`text-center mb-4`}>
                          <span className={`text-4xl font-black ${style.text}`}>{score}</span>
                        </div>
                        <div className="pulse-slider-wrapper">
                          <Slider
                            value={[score]}
                            onValueChange={(value) => handleScoreChange(question.question_key, value)}
                            min={0}
                            max={100}
                            step={1}
                            className="w-full"
                          />
                        </div>
                      </div>
                      <div className="flex justify-between mt-2">
                        <span className={`text-xs ${style.text}/60`}>Low</span>
                        <span className={`text-xs ${style.text}/60`}>High</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Optional comment */}
                  <div>
                    <label className={`text-xs font-medium mb-2 block ${style.text}/80`}>
                      Optional comment
                    </label>
                    <Textarea
                      value={comment}
                      onChange={(e) => handleCommentChange(question.question_key, e.target.value)}
                      placeholder="Share your thoughts..."
                      className={`${getRoundedClass('rounded-lg')} min-h-[80px] resize-none ${
                        mode === 'chaos' 
                          ? 'bg-white border-2 border-black/20 text-black placeholder:text-black/40 focus:border-black/40' 
                          : mode === 'chill' 
                          ? 'bg-white border-2 border-[#4A1818]/20 text-[#4A1818] placeholder:text-[#4A1818]/40 focus:border-[#4A1818]/40' 
                          : 'bg-white/10 border-2 border-white/20 text-white placeholder:text-white/40 focus:border-white/40'
                      }`}
                    />
                  </div>
                  
                  {index < questions.length - 1 && (
                    <div className={`h-px ${mode === 'chaos' ? 'bg-black/10' : mode === 'chill' ? 'bg-[#4A1818]/10' : 'bg-white/10'}`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
        
        <div className="p-8 pt-6 flex-shrink-0 border-t border-opacity-10" style={{ borderColor: mode === 'chaos' ? 'rgba(0,0,0,0.1)' : mode === 'chill' ? 'rgba(74,24,24,0.1)' : 'rgba(255,255,255,0.1)' }}>
          <Button
            onClick={handleSubmit}
            disabled={!allAnswered || isSubmitting}
            className={`w-full ${getRoundedClass('rounded-lg')} h-12 ${
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
