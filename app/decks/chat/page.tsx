'use client'

import { useState } from 'react'
import { useMode } from '@/contexts/mode-context'
import { useAuth } from '@/contexts/auth-context'
import Link from 'next/link'
import { MessageSquare, Send, Loader2, ExternalLink, FileText, ArrowLeft } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AccountMenu } from '@/components/account-menu'
import { Footer } from '@/components/footer'

interface ChatReference {
  deck_id: string
  deck_title: string
  topic_id?: string
  topic_title?: string
  slide_id?: string
  slide_number?: number
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  references?: ChatReference[]
}

export default function DeckChatPage() {
  const { mode } = useMode()
  const { user } = useAuth()
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)

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
      case 'chill': return 'border-[#4A1818]/20'
      case 'code': return 'border-[#FFFFFF]'
      default: return 'border-[#333333]'
    }
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || loading) return

    const userMessage = message.trim()
    setMessage('')
    
    // Add user message
    const newUserMessage: ChatMessage = {
      role: 'user',
      content: userMessage,
    }
    setMessages(prev => [...prev, newUserMessage])
    setLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          limit: 10,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Chat request failed')
      }

      // Add assistant response
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.answer,
        references: data.references || [],
      }
      setMessages(prev => [...prev, assistantMessage])
    } catch (error: any) {
      console.error('Chat error:', error)
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.message || 'Unknown error'}`,
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`min-h-screen ${getBgClass()} ${getTextClass()}`}>
      {/* Header */}
      <header className={`border-b ${getBorderClass()} sticky top-0 z-50 ${getBgClass()}`}>
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/decks">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Search
              </Button>
            </Link>
            <span className="text-xl font-bold">Deck Recommendations</span>
          </div>
          <div className="flex items-center gap-4">
            <AccountMenu />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">AI Deck Recommendations</h1>
            <p className="text-muted-foreground">
              Ask for recommendations on which decks and slides to use for your presentation
            </p>
          </div>

          {/* Chat Messages */}
          <Card className="p-6 mb-6 min-h-[400px] max-h-[600px] overflow-y-auto">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">
                  Ask me for deck recommendations
                </p>
                <div className="text-sm text-muted-foreground space-y-2">
                  <p className="font-semibold">Try asking:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>"I need slides about customer acquisition strategies"</li>
                    <li>"What decks cover brand positioning?"</li>
                    <li>"Show me slides for a product launch presentation"</li>
                    <li>"Find decks about market research methodologies"</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-4 ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      
                      {msg.references && msg.references.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-border/50">
                          <p className="text-xs font-semibold mb-2">References:</p>
                          <div className="space-y-2">
                            {msg.references.map((ref, refIdx) => (
                              <div key={refIdx} className="text-xs">
                                <div className="flex items-center gap-2">
                                  <FileText className="w-3 h-3" />
                                  <span className="font-semibold">{ref.deck_title}</span>
                                  {ref.topic_title && (
                                    <span className="text-muted-foreground">
                                      • Topic: {ref.topic_title}
                                    </span>
                                  )}
                                  {ref.slide_number && (
                                    <span className="text-muted-foreground">
                                      • Slide {ref.slide_number}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg p-4">
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Input Form */}
          <Card className="p-4">
            <form onSubmit={handleSend} className="flex gap-2">
              <Input
                type="text"
                placeholder="Ask for deck recommendations..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={loading}
                className="flex-1"
              />
              <Button type="submit" disabled={!message.trim() || loading}>
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </form>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  )
}


