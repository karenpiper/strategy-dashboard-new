'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { useMode } from '@/contexts/mode-context'
import { SiteHeader } from '@/components/site-header'
import { Footer } from '@/components/footer'
import { ArrowLeft, Music } from 'lucide-react'
import Link from 'next/link'

export default function SoundtracksOfOurStrifePage() {
  const { user, loading: authLoading } = useAuth()
  const { mode } = useMode()
  const router = useRouter()

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

  const getRoundedClass = (base: string) => {
    return mode === 'code' ? 'rounded-none' : base
  }

  const getAccentColor = () => {
    return mode === 'chaos' ? '#C4F500' : mode === 'chill' ? '#FFC043' : '#FFFFFF'
  }

  useEffect(() => {
    if (!user && !authLoading) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  if (loading || !user) {
    return (
      <div className={`flex flex-col min-h-screen ${getBgClass()} ${getTextClass()}`}>
        <SiteHeader />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-lg opacity-60">Loading...</p>
        </main>
      </div>
    )
  }

  return (
    <div className={`flex flex-col min-h-screen ${getBgClass()} ${getTextClass()} ${mode === 'code' ? 'font-mono' : 'font-[family-name:var(--font-raleway)]'}`}>
      <SiteHeader />

      <main className="max-w-[1400px] mx-auto px-6 py-10 flex-1 pt-24">
        <Link 
          href="/vibes" 
          className={`inline-flex items-center gap-2 mb-6 text-sm uppercase tracking-wider hover:opacity-70 transition-opacity ${getTextClass()}`}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Vibes
        </Link>

        <article className="prose prose-invert max-w-none">
          {/* Header */}
          <div className="mb-16">
            <h1 className={`text-6xl font-black uppercase mb-4 ${getTextClass()}`}>
              Soundtracks of our Strife
            </h1>
            <p className={`text-xl ${getTextClass()} opacity-70`}>
              The music that got us through
            </p>
          </div>

          {/* Placeholder content */}
          <section className="mb-20">
            <div className={`${getRoundedClass('rounded-3xl')} p-12 text-center`} style={{
              backgroundColor: mode === 'chaos' 
                ? 'rgba(255, 255, 255, 0.05)' 
                : mode === 'chill'
                ? 'rgba(74, 24, 24, 0.05)'
                : 'rgba(255, 255, 255, 0.05)'
            }}>
              <Music className="w-16 h-16 mx-auto mb-4" style={{ color: getAccentColor() }} />
              <p className={`text-lg ${getTextClass()} opacity-60`}>
                Content coming soon...
              </p>
            </div>
          </section>
        </article>

        <Footer />
      </main>
    </div>
  )
}

