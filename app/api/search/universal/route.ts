import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export interface UniversalSearchResult {
  type: 'resource' | 'work_sample' | 'must_read' | 'news' | 'person' | 'project' | 'playlist'
  id: string
  title: string
  description?: string
  url?: string
  metadata?: Record<string, any>
  score: number
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')
    const limitParam = searchParams.get('limit')

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 })
    }

    const limit = limitParam ? parseInt(limitParam, 10) : 50
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Limit must be a number between 1 and 100' },
        { status: 400 }
      )
    }

    const searchLower = query.trim().toLowerCase()
    const results: UniversalSearchResult[] = []

    // Search Resources
    const { data: resources } = await supabase
      .from('resources')
      .select('id, title, description, url, category, tags, created_at')
      .or(`title.ilike.%${searchLower}%,description.ilike.%${searchLower}%,category.ilike.%${searchLower}%`)
      .limit(limit)

    if (resources) {
      for (const resource of resources) {
        const titleMatch = resource.title?.toLowerCase().includes(searchLower) ? 1 : 0
        const descMatch = resource.description?.toLowerCase().includes(searchLower) ? 0.5 : 0
        const categoryMatch = resource.category?.toLowerCase().includes(searchLower) ? 0.3 : 0
        const score = titleMatch + descMatch + categoryMatch

        results.push({
          type: 'resource',
          id: resource.id,
          title: resource.title || 'Untitled Resource',
          description: resource.description || undefined,
          url: resource.url || undefined,
          metadata: {
            category: resource.category,
            tags: resource.tags,
            created_at: resource.created_at
          },
          score
        })
      }
    }

    // Search Work Samples
    const { data: workSamples } = await supabase
      .from('work_samples')
      .select('id, title, description, url, category, tags, created_at')
      .or(`title.ilike.%${searchLower}%,description.ilike.%${searchLower}%,category.ilike.%${searchLower}%`)
      .limit(limit)

    if (workSamples) {
      for (const sample of workSamples) {
        const titleMatch = sample.title?.toLowerCase().includes(searchLower) ? 1 : 0
        const descMatch = sample.description?.toLowerCase().includes(searchLower) ? 0.5 : 0
        const categoryMatch = sample.category?.toLowerCase().includes(searchLower) ? 0.3 : 0
        const score = titleMatch + descMatch + categoryMatch

        results.push({
          type: 'work_sample',
          id: sample.id,
          title: sample.title || 'Untitled Work Sample',
          description: sample.description || undefined,
          url: sample.url || undefined,
          metadata: {
            category: sample.category,
            tags: sample.tags,
            created_at: sample.created_at
          },
          score
        })
      }
    }

    // Search Must Reads
    const { data: mustReads } = await supabase
      .from('must_reads')
      .select('id, article_title, title, notes, article_url, url, category, summary, created_at')
      .or(`article_title.ilike.%${searchLower}%,title.ilike.%${searchLower}%,notes.ilike.%${searchLower}%,category.ilike.%${searchLower}%,summary.ilike.%${searchLower}%`)
      .limit(limit)

    if (mustReads) {
      for (const read of mustReads) {
        const titleMatch = (read.article_title || read.title)?.toLowerCase().includes(searchLower) ? 1 : 0
        const notesMatch = read.notes?.toLowerCase().includes(searchLower) ? 0.5 : 0
        const summaryMatch = read.summary?.toLowerCase().includes(searchLower) ? 0.4 : 0
        const score = titleMatch + notesMatch + summaryMatch

        results.push({
          type: 'must_read',
          id: read.id,
          title: read.article_title || read.title || 'Untitled Article',
          description: read.notes || read.summary || undefined,
          url: read.article_url || read.url || undefined,
          metadata: {
            category: read.category,
            created_at: read.created_at
          },
          score
        })
      }
    }

    // Search News
    const { data: news } = await supabase
      .from('news')
      .select('id, title, content, category, tags, created_at')
      .or(`title.ilike.%${searchLower}%,content.ilike.%${searchLower}%,category.ilike.%${searchLower}%`)
      .limit(limit)

    if (news) {
      for (const item of news) {
        const titleMatch = item.title?.toLowerCase().includes(searchLower) ? 1 : 0
        const contentMatch = item.content?.toLowerCase().includes(searchLower) ? 0.5 : 0
        const categoryMatch = item.category?.toLowerCase().includes(searchLower) ? 0.3 : 0
        const score = titleMatch + contentMatch + categoryMatch

        results.push({
          type: 'news',
          id: item.id,
          title: item.title || 'Untitled News',
          description: item.content ? item.content.substring(0, 200) : undefined,
          metadata: {
            category: item.category,
            tags: item.tags,
            created_at: item.created_at
          },
          score
        })
      }
    }

    // Search People (Profiles)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, discipline, bio')
      .or(`full_name.ilike.%${searchLower}%,email.ilike.%${searchLower}%,role.ilike.%${searchLower}%,discipline.ilike.%${searchLower}%`)
      .eq('is_active', true)
      .limit(limit)

    if (profiles) {
      for (const profile of profiles) {
        const nameMatch = profile.full_name?.toLowerCase().includes(searchLower) ? 1 : 0
        const emailMatch = profile.email?.toLowerCase().includes(searchLower) ? 0.8 : 0
        const roleMatch = profile.role?.toLowerCase().includes(searchLower) ? 0.5 : 0
        const disciplineMatch = profile.discipline?.toLowerCase().includes(searchLower) ? 0.5 : 0
        const score = nameMatch + emailMatch + roleMatch + disciplineMatch

        if (score > 0) {
          results.push({
            type: 'person',
            id: profile.id,
            title: profile.full_name || profile.email || 'Unknown',
            description: profile.bio || `${profile.role || ''} ${profile.discipline || ''}`.trim() || undefined,
            metadata: {
              email: profile.email,
              role: profile.role,
              discipline: profile.discipline
            },
            score
          })
        }
      }
    }

    // Search Projects (Pipeline)
    const { data: projects } = await supabase
      .from('pipeline_projects')
      .select('id, name, description, type, status, notes, lead, team')
      .or(`name.ilike.%${searchLower}%,description.ilike.%${searchLower}%,type.ilike.%${searchLower}%,status.ilike.%${searchLower}%,notes.ilike.%${searchLower}%,lead.ilike.%${searchLower}%,team.ilike.%${searchLower}%`)
      .limit(limit)

    if (projects) {
      for (const project of projects) {
        const nameMatch = project.name?.toLowerCase().includes(searchLower) ? 1 : 0
        const descMatch = project.description?.toLowerCase().includes(searchLower) ? 0.5 : 0
        const typeMatch = project.type?.toLowerCase().includes(searchLower) ? 0.3 : 0
        const score = nameMatch + descMatch + typeMatch

        results.push({
          type: 'project',
          id: project.id,
          title: project.name || 'Untitled Project',
          description: project.description || undefined,
          metadata: {
            type: project.type,
            status: project.status,
            lead: project.lead,
            team: project.team
          },
          score
        })
      }
    }

    // Search Playlists
    const { data: playlists } = await supabase
      .from('playlists')
      .select('id, title, description, curator, date, spotify_url')
      .or(`title.ilike.%${searchLower}%,description.ilike.%${searchLower}%,curator.ilike.%${searchLower}%`)
      .limit(limit)

    if (playlists) {
      for (const playlist of playlists) {
        const titleMatch = playlist.title?.toLowerCase().includes(searchLower) ? 1 : 0
        const descMatch = playlist.description?.toLowerCase().includes(searchLower) ? 0.5 : 0
        const curatorMatch = playlist.curator?.toLowerCase().includes(searchLower) ? 0.3 : 0
        const score = titleMatch + descMatch + curatorMatch

        results.push({
          type: 'playlist',
          id: playlist.id,
          title: playlist.title || 'Untitled Playlist',
          description: playlist.description || undefined,
          url: playlist.spotify_url || undefined,
          metadata: {
            curator: playlist.curator,
            date: playlist.date
          },
          score
        })
      }
    }

    // Sort by score and limit results
    const sortedResults = results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)

    return NextResponse.json({
      query: query.trim(),
      results: sortedResults,
      total: sortedResults.length
    })
  } catch (error: any) {
    console.error('Error in universal search:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to perform search' },
      { status: 500 }
    )
  }
}


