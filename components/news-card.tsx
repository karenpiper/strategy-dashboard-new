'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ExternalLink, Calendar, User, ArrowRight } from 'lucide-react'
import { useMode } from '@/contexts/mode-context'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import Image from 'next/image'
import './news-card.css'

interface NewsItem {
  id: string
  title: string
  content?: string | null
  url?: string | null
  image_url?: string | null
  category?: string | null
  tags?: string[] | null
  pinned?: boolean
  headline_only?: boolean
  published_date?: string | null
  submitted_by_profile?: {
    full_name?: string | null
    email?: string | null
  } | null
}

export function NewsCard() {
  const { mode } = useMode()
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null)

  useEffect(() => {
    async function fetchNews() {
      try {
        // Fetch pinned news first, then most recent if no pinned
        const response = await fetch('/api/news?pinned=true&limit=1&sortBy=published_date&sortOrder=desc', {
          cache: 'no-store'
        })
        const result = await response.json()
        
        if (response.ok && result.data && result.data.length > 0) {
          setNews(result.data)
        } else {
          // If no pinned news, fetch most recent
          const recentResponse = await fetch('/api/news?limit=1&sortBy=published_date&sortOrder=desc', {
            cache: 'no-store'
          })
          const recentResult = await recentResponse.json()
          if (recentResponse.ok && recentResult.data && recentResult.data.length > 0) {
            setNews(recentResult.data)
          }
        }
      } catch (error) {
        console.error('Error fetching news:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchNews()
  }, [])

  if (loading || news.length === 0) {
    return null
  }

  const latestNews = news[0]

  const getCardStyle = () => {
    if (mode === 'chaos') {
      return {
        bg: 'bg-[#C4F500]',
        border: 'border-4 border-[#C4F500]',
        text: 'text-black',
        accent: '#C4F500',
        newsTitleBg: 'bg-black',
        newsTitleText: 'text-[#C4F500]'
      }
    } else if (mode === 'chill') {
      return {
        bg: 'bg-[#FFC043]',
        border: 'border-4 border-[#FFC043]',
        text: 'text-[#4A1818]',
        accent: '#FFC043',
        newsTitleBg: 'bg-[#4A1818]',
        newsTitleText: 'text-[#FFC043]'
      }
    } else {
      return {
        bg: 'bg-[#FFFFFF]',
        border: 'border-4 border-[#FFFFFF]',
        text: 'text-[#000000]',
        accent: '#FFFFFF',
        newsTitleBg: 'bg-black',
        newsTitleText: 'text-white'
      }
    }
  }

  const getRoundedClass = () => {
    if (mode === 'chaos') return 'rounded-[1.5rem]'
    if (mode === 'chill') return 'rounded-2xl'
    return 'rounded-none'
  }

  const getDialogStyle = () => {
    if (mode === 'chaos') {
      return {
        bg: 'bg-[#1A1A1A]',
        border: 'border-2 border-[#C4F500]',
        text: 'text-white',
        accent: '#C4F500'
      }
    } else if (mode === 'chill') {
      return {
        bg: 'bg-white',
        border: 'border-2 border-[#FFC043]',
        text: 'text-[#4A1818]',
        accent: '#FFC043'
      }
    } else {
      return {
        bg: 'bg-[#000000]',
        border: 'border-2 border-[#FFFFFF]',
        text: 'text-[#FFFFFF]',
        accent: '#FFFFFF'
      }
    }
  }

  const style = getCardStyle()
  const dialogStyle = getDialogStyle()
  
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const handleCardClick = () => {
    setSelectedNews(latestNews)
    setDialogOpen(true)
  }

  const hasMoreInfo = latestNews.content && latestNews.content.length > 150

  // Headline-only display with oversized scrolling text
  if (latestNews.headline_only) {
    return (
      <>
        <div className="mb-6 cursor-pointer" onClick={handleCardClick}>
          <Card className={`${style.bg} ${style.border} p-0 ${getRoundedClass()} w-full overflow-hidden transition-all hover:scale-[1.01] hover:shadow-2xl`}
                style={{ boxShadow: `0 0 40px ${style.accent}40` }}
          >
            <div className="relative h-32 md:h-40 overflow-hidden">
              {/* Scrolling text container */}
              <div className="absolute inset-0 flex items-center">
                <div className="animate-scroll-text whitespace-nowrap">
                  <span className={`${style.text} text-[clamp(4rem,12vw,10rem)] font-black uppercase leading-none tracking-tighter inline-block ${mode === 'code' ? 'font-mono' : ''}`}>
                    {latestNews.title} • {latestNews.title} • {latestNews.title} • 
                  </span>
                </div>
              </div>
              {/* Gradient overlays for fade effect */}
              <div className={`absolute left-0 top-0 bottom-0 w-20 ${style.bg} opacity-100 z-10`} style={{
                background: `linear-gradient(to right, ${mode === 'chaos' ? '#C4F500' : mode === 'chill' ? '#FFC043' : '#FFFFFF'}, transparent)`
              }}></div>
              <div className={`absolute right-0 top-0 bottom-0 w-20 ${style.bg} opacity-100 z-10`} style={{
                background: `linear-gradient(to left, ${mode === 'chaos' ? '#C4F500' : mode === 'chill' ? '#FFC043' : '#FFFFFF'}, transparent)`
              }}></div>
            </div>
          </Card>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="mb-6 cursor-pointer" onClick={handleCardClick}>
        <Card className={`${style.bg} ${style.border} p-0 ${getRoundedClass()} w-full overflow-hidden transition-all hover:scale-[1.01] hover:shadow-2xl`}
              style={{ boxShadow: `0 0 40px ${style.accent}40` }}
        >
          <div className="flex flex-col md:flex-row">
            {/* Left Side - NEWS Title with optional GIF/Image */}
            <div className={`${style.newsTitleBg} px-8 py-6 md:py-12 flex items-center justify-center md:justify-start min-w-[200px] md:min-w-[280px] relative overflow-hidden`}>
              {latestNews.image_url ? (
                <>
                  {/* Background Image/GIF with rounded corners */}
                  <div className={`absolute inset-0 ${getRoundedClass()} overflow-hidden`}>
                    {latestNews.image_url.endsWith('.gif') ? (
                      <img
                        src={latestNews.image_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Image
                        src={latestNews.image_url}
                        alt=""
                        fill
                        className="object-cover"
                      />
                    )}
                  </div>
                  {/* Overlay for text readability */}
                  <div className={`absolute inset-0 ${style.newsTitleBg} opacity-80 ${getRoundedClass()}`}></div>
                  {/* NEWS Title Overlay */}
                  <h2 className={`${style.newsTitleText} text-[clamp(3rem,8vw,6rem)] font-black uppercase leading-none tracking-tighter relative z-10 ${mode === 'code' ? 'font-mono' : ''}`}>
                    NEWS
                  </h2>
                </>
              ) : (
                <h2 className={`${style.newsTitleText} text-[clamp(3rem,8vw,6rem)] font-black uppercase leading-none tracking-tighter ${mode === 'code' ? 'font-mono' : ''}`}>
                  NEWS
                </h2>
              )}
            </div>

            {/* Right Side - Content */}
            <div className="flex-1 p-6 md:p-8 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  {latestNews.pinned && (
                    <Badge 
                      className="text-xs font-black uppercase px-3 py-1"
                      style={{ 
                        backgroundColor: style.newsTitleBg,
                        color: style.newsTitleText
                      }}
                    >
                      Pinned
                    </Badge>
                  )}
                  {latestNews.category && (
                    <Badge 
                      variant="outline"
                      className={`text-xs font-semibold border-2 ${style.text} border-current/50`}
                    >
                      {latestNews.category}
                    </Badge>
                  )}
                </div>

                <h3 className={`text-3xl md:text-4xl font-black mb-4 ${style.text} leading-tight`}>
                  {latestNews.title}
                </h3>

                {latestNews.content && (
                  <p className={`text-base md:text-lg mb-4 line-clamp-2 ${style.text}/90 font-medium`}>
                    {latestNews.content}
                  </p>
                )}

                <div className="flex items-center gap-4 text-sm flex-wrap">
                  {latestNews.published_date && (
                    <div className={`flex items-center gap-2 ${style.text}/80 font-semibold`}>
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(latestNews.published_date)}</span>
                    </div>
                  )}
                  {latestNews.submitted_by_profile?.full_name && (
                    <div className={`flex items-center gap-2 ${style.text}/80 font-semibold`}>
                      <User className="w-4 h-4" />
                      <span>{latestNews.submitted_by_profile.full_name}</span>
                    </div>
                  )}
                </div>
              </div>

              {hasMoreInfo && (
                <div className="mt-6 flex items-center gap-2">
                  <span className={`text-sm font-black uppercase tracking-wider ${style.text}`}>
                    Read More
                  </span>
                  <ArrowRight className={`w-5 h-5 ${style.text}`} />
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* News Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent 
          className={`${dialogStyle.bg} ${dialogStyle.border} ${getRoundedClass()} max-w-4xl max-h-[90vh] overflow-y-auto p-0`}
          style={{ borderWidth: '2px' }}
        >
          <DialogHeader className={`p-6 pb-4 border-b ${dialogStyle.border}`} style={{ borderWidth: '0 0 2px 0' }}>
            <div className="flex items-center gap-3 mb-2">
              {selectedNews?.pinned && (
                <Badge 
                  className="text-xs font-black uppercase"
                  style={{ 
                    backgroundColor: dialogStyle.accent,
                    color: mode === 'chaos' ? '#000000' : mode === 'chill' ? '#4A1818' : '#000000'
                  }}
                >
                  Pinned
                </Badge>
              )}
              {selectedNews?.category && (
                <Badge 
                  variant="outline"
                  className={`text-xs ${dialogStyle.text} border-current/50`}
                >
                  {selectedNews.category}
                </Badge>
              )}
            </div>
            <DialogTitle className={`text-3xl md:text-4xl font-black ${dialogStyle.text} leading-tight`}>
              {selectedNews?.title}
            </DialogTitle>
            <div className="flex items-center gap-4 text-sm mt-3">
              {selectedNews?.published_date && (
                <div className={`flex items-center gap-2 ${dialogStyle.text}/80`}>
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(selectedNews.published_date)}</span>
                </div>
              )}
              {selectedNews?.submitted_by_profile?.full_name && (
                <div className={`flex items-center gap-2 ${dialogStyle.text}/80`}>
                  <User className="w-4 h-4" />
                  <span>{selectedNews.submitted_by_profile.full_name}</span>
                </div>
              )}
            </div>
          </DialogHeader>

          <div className="p-6 space-y-6">
            {selectedNews?.image_url && (
              <div className={`relative w-full aspect-video ${getRoundedClass()} overflow-hidden`}>
                {selectedNews.image_url.endsWith('.gif') ? (
                  <img
                    src={selectedNews.image_url}
                    alt={selectedNews.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Image
                    src={selectedNews.image_url}
                    alt={selectedNews.title}
                    fill
                    className="object-cover"
                  />
                )}
              </div>
            )}

            {selectedNews?.content && (
              <div className={`prose prose-invert max-w-none ${dialogStyle.text}`}>
                <p className={`text-base md:text-lg leading-relaxed whitespace-pre-wrap ${dialogStyle.text}`}>
                  {selectedNews.content}
                </p>
              </div>
            )}

            {selectedNews?.tags && selectedNews.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedNews.tags.map((tag, idx) => (
                  <Badge 
                    key={idx}
                    variant="outline"
                    className={`text-xs ${dialogStyle.text} border-current/50`}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {selectedNews?.url && (
              <div className="pt-4 border-t" style={{ borderColor: `${dialogStyle.accent}30` }}>
                <a
                  href={selectedNews.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-2 px-6 py-3 ${getRoundedClass()} font-black text-sm uppercase transition-all hover:opacity-80`}
                  style={{
                    backgroundColor: dialogStyle.accent,
                    color: mode === 'chaos' ? '#000000' : mode === 'chill' ? '#4A1818' : '#000000'
                  }}
                >
                  Read Full Article
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

