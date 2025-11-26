import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all weekly questions with their answers, ordered by week_start_date (newest first)
    const { data: questions, error: questionsError } = await supabase
      .from('weekly_questions')
      .select(`
        id,
        question_text,
        week_start_date,
        created_at,
        weekly_question_answers (
          id,
          answer_text,
          user_id,
          created_at,
          profiles:user_id (
            full_name,
            email
          )
        )
      `)
      .order('week_start_date', { ascending: false })

    if (questionsError) {
      console.error('Error fetching weekly questions:', questionsError)
      return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
    }

    if (!questions || questions.length === 0) {
      return NextResponse.json({ weeks: [] })
    }

    // Format the data
    const weeksData = questions.map(question => {
      const answers = (question.weekly_question_answers || []).map((answer: any) => ({
        id: answer.id,
        answer_text: answer.answer_text,
        author: answer.profiles?.full_name || answer.profiles?.email || 'Anonymous',
        created_at: answer.created_at
      }))

      return {
        week_start_date: question.week_start_date,
        question_text: question.question_text,
        total_answers: answers.length,
        answers: answers.sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      }
    })

    return NextResponse.json({ weeks: weeksData })
  } catch (error) {
    console.error('Error in weekly-questions historical:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

