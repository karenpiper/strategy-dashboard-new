'use client'

import { useState, useEffect, useRef } from 'react'
import { useMode } from '@/contexts/mode-context'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Send, Bot, X } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ChatbotProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function Chatbot({ open, onOpenChange }: ChatbotProps) {
  const { mode } = useMode()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [open])

  // Get background color based on mode
  const getBackgroundColor = () => {
    if (mode === 'chill') {
      return '#FFFFFF'
    } else if (mode === 'code') {
      return '#000000'
    }
    return '#1a1a1a' // default dark (chaos)
  }

  // Get text color based on mode
  const getTextColor = () => {
    if (mode === 'chill') {
      return '#4A1818'
    } else if (mode === 'code') {
      return '#FFFFFF'
    }
    return '#FFFFFF' // default (chaos)
  }

  // Get border color based on mode
  const getBorderColor = () => {
    if (mode === 'chill') {
      return '#E5E5E5'
    } else if (mode === 'code') {
      return '#FFFFFF'
    }
    return '#333333' // default (chaos)
  }

  // Get rounded class based on mode
  const getRoundedClass = (defaultClass: string) => {
    return mode === 'code' ? 'rounded-none' : defaultClass
  }

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault()
    
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setError(null)

    // Add user message to conversation
    const newUserMessage: Message = { role: 'user', content: userMessage }
    setMessages(prev => [...prev, newUserMessage])

    setLoading(true)

    try {
      const response = await fetch('/api/elvex-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory: messages,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response')
      }

      // Add assistant response to conversation
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message || 'No response received',
      }
      setMessages(prev => [...prev, assistantMessage])
    } catch (err: any) {
      console.error('Error sending message:', err)
      setError(err.message || 'Failed to send message. Please try again.')
      // Remove the user message if there was an error
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    setMessages([])
    setError(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`sm:max-w-2xl max-h-[80vh] flex flex-col p-0 ${getRoundedClass('rounded-[2.5rem]')}`}
        style={{
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          borderWidth: mode === 'chaos' ? '2px' : '1px',
        }}
      >
        <DialogHeader className={`px-6 pt-6 pb-4 border-b ${getRoundedClass('rounded-t-[2.5rem]')}`} style={{ borderColor: getBorderColor() }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 ${getRoundedClass('rounded-lg')} flex items-center justify-center`}
                style={{
                  backgroundColor: mode === 'chaos' ? '#00C896' : mode === 'chill' ? '#00C896' : '#FFFFFF',
                }}
              >
                <Bot className="w-5 h-5 text-white" />
              </div>
              <DialogTitle
                className={`text-xl font-black uppercase ${mode === 'code' ? 'font-mono' : ''}`}
                style={{ color: getTextColor() }}
              >
                DeckTalk
              </DialogTitle>
            </div>
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className={`text-xs ${getRoundedClass('rounded-full')}`}
                style={{
                  color: mode === 'chill' ? '#4A1818' : '#FFFFFF',
                }}
              >
                Clear
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Messages area */}
        <div
          className="flex-1 overflow-y-auto px-6 py-4 space-y-4"
          style={{ minHeight: '300px', maxHeight: 'calc(80vh - 200px)' }}
        >
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full py-12">
              <Bot
                className="w-16 h-16 mb-4"
                style={{
                  color: mode === 'chill' ? '#4A1818' : '#FFFFFF',
                  opacity: 0.5,
                }}
              />
              <p
                className={`text-center text-sm ${mode === 'code' ? 'font-mono' : ''}`}
                style={{
                  color: mode === 'chill' ? '#4A1818' : '#FFFFFF',
                  opacity: 0.7,
                }}
              >
                Start a conversation with DeckTalk
              </p>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] ${getRoundedClass('rounded-xl')} px-4 py-3 ${
                  message.role === 'user'
                    ? mode === 'chaos'
                      ? 'bg-[#00C896] text-black'
                      : mode === 'chill'
                      ? 'bg-[#00C896] text-white'
                      : 'bg-white text-black'
                    : mode === 'chill'
                    ? 'bg-white/50 border'
                    : 'bg-black/40 border'
                }`}
                style={{
                  borderColor:
                    message.role === 'assistant' ? getBorderColor() : undefined,
                  borderWidth: message.role === 'assistant' ? '1px' : undefined,
                }}
              >
                <p
                  className={`text-sm whitespace-pre-wrap ${mode === 'code' ? 'font-mono' : ''}`}
                  style={{
                    color:
                      message.role === 'user'
                        ? message.role === 'user' && mode === 'chaos'
                          ? '#000000'
                          : message.role === 'user' && mode === 'chill'
                          ? '#FFFFFF'
                          : '#000000'
                        : getTextColor(),
                  }}
                >
                  {message.content}
                </p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div
                className={`${getRoundedClass('rounded-xl')} px-4 py-3 ${
                  mode === 'chill' ? 'bg-white/50 border' : 'bg-black/40 border'
                }`}
                style={{
                  borderColor: getBorderColor(),
                  borderWidth: '1px',
                }}
              >
                <Loader2
                  className="w-5 h-5 animate-spin"
                  style={{ color: getTextColor() }}
                />
              </div>
            </div>
          )}

          {error && (
            <div
              className={`p-3 ${getRoundedClass('rounded-lg')} border`}
              style={{
                backgroundColor: mode === 'chill' ? '#FFE5E5' : '#4A1818',
                borderColor: mode === 'chill' ? '#FF4C4C' : '#C41E3A',
                color: mode === 'chill' ? '#4A1818' : '#FFFFFF',
              }}
            >
              <p className="text-sm">{error}</p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div
          className={`px-6 py-4 border-t ${getRoundedClass('rounded-b-[2.5rem]')}`}
          style={{ borderColor: getBorderColor() }}
        >
          <form onSubmit={handleSend} className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              disabled={loading}
              className={`flex-1 ${getRoundedClass('rounded-full')} ${
                mode === 'code' ? 'font-mono' : ''
              }`}
              style={{
                backgroundColor:
                  mode === 'chill' ? '#FFFFFF' : mode === 'code' ? '#1a1a1a' : '#2a2a2a',
                borderColor: getBorderColor(),
                color: getTextColor(),
              }}
            />
            <Button
              type="submit"
              disabled={!input.trim() || loading}
              className={`${getRoundedClass('rounded-full')} px-4`}
              style={{
                backgroundColor:
                  mode === 'chaos'
                    ? '#00C896'
                    : mode === 'chill'
                    ? '#00C896'
                    : '#FFFFFF',
                color: mode === 'code' ? '#000000' : '#000000',
              }}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}

