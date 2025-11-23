import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Get all active questions
    const { data: questions, error } = await supabase
      .from('team_pulse_questions')
      .select('question_key, question_text')
      .eq('is_active', true)

    if (error) {
      console.error('Error fetching questions:', error)
      return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 })
    }

    if (!questions || questions.length === 0) {
      // Fallback to default questions if database is empty
      const defaultQuestions = [
        { question_key: 'week', question_text: 'How was your week?' },
        { question_key: 'priorities', question_text: 'How clear were priorities?' },
        { question_key: 'workload', question_text: 'How heavy was your workload?' },
        { question_key: 'support', question_text: 'How supported did you feel?' },
        { question_key: 'energy', question_text: 'How was your energy level?' },
      ]
      
      // Shuffle and pick 2
      const shuffled = [...defaultQuestions].sort(() => Math.random() - 0.5)
      return NextResponse.json({ questions: shuffled.slice(0, 2) })
    }

    // Shuffle and pick 2 random questions
    const shuffled = [...questions].sort(() => Math.random() - 0.5)
    const selectedQuestions = shuffled.slice(0, 2)

    return NextResponse.json({ questions: selectedQuestions })
  } catch (error) {
    console.error('Error in team-pulse questions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

