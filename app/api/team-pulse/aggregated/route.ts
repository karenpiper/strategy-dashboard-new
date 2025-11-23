import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current week start (Monday)
    const now = new Date()
    const dayOfWeek = now.getDay()
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
    const weekStart = new Date(now.setDate(diff))
    weekStart.setHours(0, 0, 0, 0)
    const weekKey = weekStart.toISOString().split('T')[0]

    // Get all responses for this week
    const { data: responses, error } = await supabase
      .from('team_pulse_responses')
      .select('question_key, score, comment')
      .eq('week_key', weekKey)

    if (error) {
      console.error('Error fetching aggregated data:', error)
      return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
    }

    if (!responses || responses.length === 0) {
      return NextResponse.json({
        totalResponses: 0,
        aggregatedData: [],
      })
    }

    // Get unique user count
    const { count } = await supabase
      .from('team_pulse_responses')
      .select('user_id', { count: 'exact', head: true })
      .eq('week_key', weekKey)

    const totalResponses = count || 0

    // Aggregate by question
    const questionGroups: Record<string, { scores: number[]; comments: string[] }> = {}
    
    responses.forEach((r) => {
      if (!questionGroups[r.question_key]) {
        questionGroups[r.question_key] = { scores: [], comments: [] }
      }
      questionGroups[r.question_key].scores.push(r.score)
      if (r.comment) {
        questionGroups[r.question_key].comments.push(r.comment)
      }
    })

    // Get question texts (if questions table exists)
    const questionMap = new Map<string, string>()
    try {
      const { data: allQuestions } = await supabase
        .from('team_pulse_questions')
        .select('question_key, question_text')
      
      allQuestions?.forEach(q => {
        questionMap.set(q.question_key, q.question_text)
      })
    } catch (error) {
      // Questions table might not exist yet, that's okay
      console.log('Questions table not found, using question keys only')
    }

    // Calculate averages and extract comment themes
    const aggregatedData = Object.entries(questionGroups).map(([questionKey, data]) => {
      const average = data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length
      
      // Simple theme extraction (group similar words/phrases)
      const commentThemes: Record<string, number> = {}
      data.comments.forEach((comment) => {
        // Extract key phrases (simple approach - can be enhanced with NLP)
        const words = comment.toLowerCase()
          .replace(/[^\w\s]/g, '')
          .split(/\s+/)
          .filter(w => w.length > 3) // Filter out short words
        
        // Group by common words/phrases
        words.forEach((word) => {
          commentThemes[word] = (commentThemes[word] || 0) + 1
        })
      })

      // Get top themes (appearing in 2+ comments)
      const themes = Object.entries(commentThemes)
        .filter(([_, count]) => count >= 2)
        .sort(([_, a], [__, b]) => b - a)
        .slice(0, 5)
        .map(([theme, count]) => ({ theme, count }))

      return {
        questionKey,
        questionText: questionMap.get(questionKey),
        average,
        responseCount: data.scores.length,
        commentThemes: themes,
      }
    })

    return NextResponse.json({
      totalResponses,
      aggregatedData,
    })
  } catch (error) {
    console.error('Error in aggregated:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

