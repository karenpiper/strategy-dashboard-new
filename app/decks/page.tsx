'use client'

import { useState, useEffect } from 'react'
import { useMode } from '@/contexts/mode-context'
import { useAuth } from '@/contexts/auth-context'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, ExternalLink, FileText, MessageSquare, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AccountMenu } from '@/components/account-menu'
import { Footer } from '@/components/footer'

interface SearchResult {
  type: 'topic' | 'slide'
  deck_id: string
  deck_title: string
  deck_gdrive_url?: string
  topic_id?: string
  slide_id?: string
  slide_number?: number
  summary: string
  score: number
}

export default function DecksPage() {
  const { mode } = useMode()
  const { user } = useAuth()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

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
      case 'code': return 'text-[#4A1818]'
      default: return 'text-white'
    }
  }

  const getBorderClass = () => {
    switch (mode) {
      case 'chaos': return 'border-[#333333]'
      case 'chill': return 'border-[#4A1818]/20'
      case 'code': return 'border-[#FFFFFF]'
      default: return 'border-[#333333]'
    }
  }

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      setHasSearched(false)
      return
    }

    setLoading(true)
    setHasSearched(true)

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=20`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Search failed')
      }

      setSearchResults(data.results || [])
    } catch (error: any) {
      console.error('Search error:', error)
      setSearchResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSearch(searchQuery)
  }

  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        handleSearch(searchQuery)
      } else {
        setSearchResults([])
        setHasSearched(false)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [searchQuery])

  return (
    <div className={`flex flex-col ${getBgClass()} ${getTextClass()}`}>
      {/* Header */}
      <header className={`border-b ${getBorderClass()} sticky top-0 z-50 ${getBgClass()}`}>
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            Strategy Dashboard
          </Link>
          <div className="flex items-center gap-4">
            <AccountMenu />
          </div>
        </div>
      </header>

      <main className="flex-1">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Deck Search</h1>
            <p className="text-muted-foreground">
              Search through uploaded presentation decks using keyword or semantic search
            </p>
          </div>

          {/* Search Bar */}
          <Card className="p-6 mb-6">
            <form onSubmit={handleSearchSubmit} className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search decks, topics, or slides..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Search
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Try searching for concepts, themes, or specific content. Results include both keyword matches and semantic similarity.
              </p>
            </form>
          </Card>

          {/* Results */}
          {hasSearched && (
            <div>
              {loading ? (
                <Card className="p-8 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                  <p className="text-muted-foreground">Searching...</p>
                </Card>
              ) : searchResults.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">
                    No results found. Try different keywords or check your spelling.
                  </p>
                </Card>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-muted-foreground">
                      Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                    </p>
                    <Link href="/decks/chat">
                      <Button variant="outline" size="sm">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Ask AI for Recommendations
                      </Button>
                    </Link>
                  </div>

                  {searchResults.map((result, idx) => (
                    <Card key={`${result.type}-${result.topic_id || result.slide_id || result.deck_id}-${idx}`} className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {result.type === 'topic' ? (
                              <FileText className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <FileText className="w-4 h-4 text-muted-foreground" />
                            )}
                            <span className="text-xs font-semibold uppercase text-muted-foreground">
                              {result.type === 'topic' ? 'Topic' : `Slide ${result.slide_number}`}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              • Score: {(result.score * 100).toFixed(0)}%
                            </span>
                          </div>
                          <h3 className="font-semibold mb-1">{result.deck_title}</h3>
                          <p className="text-sm text-muted-foreground mb-2">{result.summary}</p>
                        </div>
                        {result.deck_gdrive_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                          >
                            <a
                              href={result.deck_gdrive_url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              View
                            </a>
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {!hasSearched && (
            <Card className="p-8 text-center">
              <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">
                Enter a search query to find decks, topics, and slides
              </p>
              <div className="text-sm text-muted-foreground space-y-2">
                <p className="font-semibold">Try searching for:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Marketing strategies</li>
                  <li>Customer acquisition</li>
                  <li>Product launches</li>
                  <li>Brand positioning</li>
                </ul>
              </div>
            </Card>
          )}
        </div>
      </div>
      
      <Footer />
      </main>
    </div>
  )
}

