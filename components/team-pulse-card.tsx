'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useMode } from '@/contexts/mode-context'
import { useAuth } from '@/contexts/auth-context'
import { Lock, ArrowRight, CheckCircle, Users } from 'lucide-react'

interface PulseQuestion {
  id: string
  text: string
  key: string
}

interface PulseResponse {
  questionKey: string
  score: number
  comment?: string
}

interface AggregatedData {
  questionKey: string
  average: number
  responseCount: number
  commentThemes: { theme: string; count: number }[]
}

const QUESTIONS: PulseQuestion[] = [
  { id: 'week', text: 'How was your week?', key: 'week' },
  { id: 'priorities', text: 'How clear were priorities?', key: 'priorities' },
  { id: 'workload', text: 'How heavy was your workload?', key: 'workload' },
  { id: 'support', text: 'How supported did you feel?', key: 'support' },
  { id: 'energy', text: 'How was your energy level?', key: 'energy' },
]

const MIN_SAMPLE_COUNT = 5

export function TeamPulseCard() {
  const { mode } = useMode()
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState<'survey' | 'results'>('survey')
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [isCommentStep, setIsCommentStep] = useState(false)
  const [responses, setResponses] = useState<Record<string, PulseResponse>>({})
  const [currentComment, setCurrentComment] = useState('')
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [aggregatedData, setAggregatedData] = useState<AggregatedData[]>([])
  const [totalResponses, setTotalResponses] = useState(0)
  const [shuffledQuestions, setShuffledQuestions] = useState<PulseQuestion[]>([])

  // Shuffle questions on mount
  useEffect(() => {
    const shuffled = [...QUESTIONS].sort(() => Math.random() - 0.5)
    setShuffledQuestions(shuffled)
  }, [])

  // Check if user has already submitted this week
  useEffect(() => {
    async function checkSubmission() {
      if (!user) return
      try {
        const response = await fetch('/api/team-pulse/check-submission')
        if (response.ok) {
          const data = await response.json()
          setHasSubmitted(data.hasSubmitted)
          if (data.hasSubmitted) {
            loadAggregatedData()
          }
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
        if (data.totalResponses >= MIN_SAMPLE_COUNT) {
          setCurrentStep('results')
        }
      }
    } catch (error) {
      console.error('Error loading aggregated data:', error)
    }
  }

  const currentQuestion = shuffledQuestions[currentQuestionIndex]
  const currentResponse = currentQuestion ? responses[currentQuestion.key] : null
  const currentScore = currentResponse?.score ?? 50

  const handleScoreChange = (value: number[]) => {
    if (!currentQuestion) return
    setResponses({
      ...responses,
      [currentQuestion.key]: {
        ...responses[currentQuestion.key],
        questionKey: currentQuestion.key,
        score: value[0],
      },
    })
  }

  const handleNext = () => {
    // Move to comment step for current question
    if (currentResponse && currentResponse.score !== undefined) {
      setIsCommentStep(true)
    }
  }

  const handleSkipComment = () => {
    // Save response without comment and move to next question
    if (!currentQuestion) return
    
    setResponses({
      ...responses,
      [currentQuestion.key]: {
        ...responses[currentQuestion.key],
        questionKey: currentQuestion.key,
        comment: undefined,
      },
    })
    setCurrentComment('')
    setIsCommentStep(false)
    
    if (currentQuestionIndex < shuffledQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    } else {
      // All questions answered, submit
      handleSubmit()
    }
  }

  const handleSubmitComment = () => {
    if (!currentQuestion) return
    
    setResponses({
      ...responses,
      [currentQuestion.key]: {
        ...responses[currentQuestion.key],
        questionKey: currentQuestion.key,
        comment: currentComment.trim() || undefined,
      },
    })
    setCurrentComment('')
    setIsCommentStep(false)
    
    if (currentQuestionIndex < shuffledQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    } else {
      // All questions answered, submit
      handleSubmit()
    }
  }

  const handleSubmit = async () => {
    if (!user) return
    
    try {
      const response = await fetch('/api/team-pulse/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responses: Object.values(responses),
        }),
      })

      if (response.ok) {
        setHasSubmitted(true)
        await loadAggregatedData()
      }
    } catch (error) {
      console.error('Error submitting pulse:', error)
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

  const style = mode === 'chaos' 
    ? { bg: 'bg-white', border: 'border-0', text: 'text-black', accent: '#00FF87' }
    : mode === 'chill'
    ? { bg: 'bg-white', border: 'border-0', text: 'text-[#4A1818]', accent: '#C8D961' }
    : { bg: 'bg-black', border: 'border-0', text: 'text-white', accent: '#ffffff' }

  const barColor = mode === 'chaos' ? '#00FF87' : mode === 'chill' ? '#C8D961' : '#ffffff'

  // Show results if we have enough responses
  if (currentStep === 'results' && totalResponses >= MIN_SAMPLE_COUNT) {
    return (
      <Card className={`${style.bg} ${style.border} p-6 ${getRoundedClass('rounded-[2.5rem]')}`}>
        <div className="flex items-center justify-between mb-4">
          <Badge className={`${mode === 'chaos' ? 'bg-[#00FF87] text-black' : mode === 'chill' ? 'bg-[#C8D961] text-[#4A1818]' : 'bg-white text-black'} border-0 font-black text-xs`}>
            {totalResponses} responses
          </Badge>
          {!hasSubmitted && (
            <Button
              onClick={() => setCurrentStep('survey')}
              className={`${getRoundedClass('rounded-lg')} text-xs h-8 px-3 ${
                mode === 'chaos' ? 'bg-black text-white hover:bg-black/80' :
                mode === 'chill' ? 'bg-[#4A1818] text-white hover:bg-[#4A1818]/80' :
                'bg-white text-black hover:bg-white/80'
              }`}
            >
              Take Survey
            </Button>
          )}
        </div>
        <h2 className={`text-3xl font-black mb-6 uppercase ${style.text}`}>Team Pulse</h2>
        
        <div className="space-y-6">
          {aggregatedData.map((data) => {
            const question = QUESTIONS.find(q => q.key === data.questionKey)
            if (!question) return null
            
            return (
              <div key={data.questionKey}>
                <div className="flex items-center justify-between mb-2">
                  <p className={`text-sm font-black ${style.text}`}>{question.text}</p>
                  <p className={`text-2xl font-black ${style.text}`}>{Math.round(data.average)}</p>
                </div>
                <div className={`w-full ${getRoundedClass('rounded-full')} h-2 ${mode === 'chaos' ? 'bg-black/40' : mode === 'chill' ? 'bg-[#F5E6D3]/50' : 'bg-white/40'}`}>
                  <div 
                    className={`h-2 ${getRoundedClass('rounded-full')}`} 
                    style={{ width: `${data.average}%`, backgroundColor: barColor }} 
                  />
                </div>
                {data.commentThemes.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {data.commentThemes.map((theme, idx) => (
                      <Badge
                        key={idx}
                        className={`text-xs ${mode === 'chaos' ? 'bg-black/20 text-black' : mode === 'chill' ? 'bg-[#F5E6D3]/50 text-[#4A1818]' : 'bg-white/20 text-white'}`}
                      >
                        {theme.theme} ({theme.count})
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Card>
    )
  }

  // Show survey
  if (!hasSubmitted && shuffledQuestions.length > 0) {
    const allQuestionsAnswered = shuffledQuestions.every(q => responses[q.key]?.score !== undefined)
    const isLastQuestion = currentQuestionIndex === shuffledQuestions.length - 1

    return (
      <Card className={`${style.bg} ${style.border} p-6 ${getRoundedClass('rounded-[2.5rem]')}`}>
        <div className="flex items-center gap-2 mb-4">
          <Lock className={`w-3 h-3 ${style.text}/60`} />
          <p className={`text-xs ${style.text}/60`}>Your response is private and only added to the group average</p>
        </div>
        
        <h2 className={`text-3xl font-black mb-6 uppercase ${style.text}`}>Team Pulse</h2>
        
        {!isCommentStep && currentResponse?.score === undefined ? (
          <>
            <div className="mb-6">
              <p className={`text-lg font-medium mb-6 ${style.text}`}>
                {currentQuestion?.text}
              </p>
              <div className="px-2">
                <Slider
                  value={[currentScore]}
                  onValueChange={handleScoreChange}
                  min={0}
                  max={100}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between mt-2">
                  <span className={`text-xs ${style.text}/60`}>Low</span>
                  <span className={`text-xs font-black ${style.text}`}>{currentScore}</span>
                  <span className={`text-xs ${style.text}/60`}>High</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className={`text-xs ${style.text}/60`}>
                {currentQuestionIndex + 1} of {shuffledQuestions.length}
              </span>
              <Button
                onClick={handleNext}
                className={`${getRoundedClass('rounded-lg')} ${
                  mode === 'chaos' ? 'bg-[#00FF87] text-black hover:bg-[#00FF87]/80' :
                  mode === 'chill' ? 'bg-[#C8D961] text-[#4A1818] hover:bg-[#C8D961]/80' :
                  'bg-white text-black hover:bg-white/80'
                } font-black uppercase tracking-wider ${mode === 'code' ? 'font-mono' : ''}`}
              >
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-6">
              <p className={`text-sm font-medium mb-2 ${style.text}/80`}>
                Optional: Add a comment (this will be grouped by theme)
              </p>
              <Textarea
                value={currentComment}
                onChange={(e) => setCurrentComment(e.target.value)}
                placeholder="Share your thoughts..."
                className={`${getRoundedClass('rounded-lg')} min-h-[100px] ${
                  mode === 'chaos' ? 'bg-black/40 border-gray-600 text-white placeholder:text-gray-500' :
                  mode === 'chill' ? 'bg-white border-gray-300 text-[#4A1818] placeholder:text-gray-400' :
                  'bg-white/10 border-gray-600 text-white placeholder:text-gray-500'
                }`}
              />
            </div>
            
            <div className="flex items-center justify-between gap-3">
              <Button
                onClick={handleSkipComment}
                variant="ghost"
                className={`${getRoundedClass('rounded-lg')} ${style.text}/60 hover:${style.text}`}
              >
                Skip
              </Button>
              <Button
                onClick={handleSubmitComment}
                className={`${getRoundedClass('rounded-lg')} ${
                  mode === 'chaos' ? 'bg-[#00FF87] text-black hover:bg-[#00FF87]/80' :
                  mode === 'chill' ? 'bg-[#C8D961] text-[#4A1818] hover:bg-[#C8D961]/80' :
                  'bg-white text-black hover:bg-white/80'
                } font-black uppercase tracking-wider ${mode === 'code' ? 'font-mono' : ''}`}
              >
                {isLastQuestion ? 'Submit' : 'Next'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </>
        )}
      </Card>
    )
  }

  // Show waiting state
  return (
    <Card className={`${style.bg} ${style.border} p-6 ${getRoundedClass('rounded-[2.5rem]')}`}>
      <div className="flex items-center gap-2 mb-4">
        <Users className={`w-4 h-4 ${style.text}/60`} />
        <p className={`text-xs ${style.text}/60`}>
          Waiting for {MIN_SAMPLE_COUNT - totalResponses} more {MIN_SAMPLE_COUNT - totalResponses === 1 ? 'response' : 'responses'} to show data
        </p>
      </div>
      <h2 className={`text-3xl font-black mb-6 uppercase ${style.text}`}>Team Pulse</h2>
      <div className={`text-center py-8 ${style.text}/70`}>
        <p className="text-sm">Thank you for your response!</p>
        <p className="text-xs mt-2">Results will appear once we have {MIN_SAMPLE_COUNT} responses.</p>
      </div>
    </Card>
  )
}

