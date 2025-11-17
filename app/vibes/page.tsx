import Link from 'next/link'
import { Users, Trophy, Music, Play, MessageCircle } from 'lucide-react'

export default function VibesPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="max-w-[2000px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4 sm:gap-6 lg:gap-12">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-[1rem] bg-accent flex items-center justify-center">
                <span className="text-lg sm:text-xl font-black text-accent-foreground">D</span>
              </div>
            </Link>
            <nav className="flex items-center gap-3 sm:gap-6 text-xs sm:text-sm lg:text-base font-semibold">
              <Link href="/" className="hover:text-accent transition-colors">HOME</Link>
              <Link href="/snaps" className="hover:text-accent transition-colors">SNAPS</Link>
              <Link href="/resources" className="hover:text-accent transition-colors">RESOURCES</Link>
              <Link href="/work" className="hover:text-accent transition-colors">WORK</Link>
              <Link href="/team" className="hover:text-accent transition-colors">TEAM</Link>
              <Link href="/vibes" className="text-accent border-b-2 border-accent pb-1">VIBES</Link>
              <Link href="#" className="hover:text-accent transition-colors">BRAND</Link>
            </nav>
          </div>
          <button className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-brand-purple flex items-center justify-center text-white hover:scale-110 transition-transform">
            <Users className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12 max-w-[2000px] mx-auto">
        {/* Page Title */}
        <h1 className="text-4xl sm:text-6xl lg:text-8xl font-black text-foreground mb-8 sm:mb-12" style={{ lineHeight: 0.85 }}>
          Vibes
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12">
          {/* Beast Babe */}
          <div className="bg-gradient-to-br from-brand-coral to-brand-coral-light text-white p-6 sm:p-8 lg:p-10 rounded-[2rem] shadow-xl">
            <p className="text-xs sm:text-sm font-bold mb-4 opacity-90">THIS WEEK'S</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-8" style={{ lineHeight: 0.85 }}>
              BEAST<br />BABE
            </h2>
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-brand-electric-orange flex items-center justify-center mb-6">
              <Trophy className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>
            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black mb-2">Sarah J.</h3>
            <p className="text-base sm:text-lg font-semibold">42 Snaps Received</p>
          </div>

          {/* Question of the Week */}
          <div className="bg-gradient-to-br from-brand-purple-light to-brand-purple text-white p-6 sm:p-8 lg:p-10 rounded-[2rem] shadow-xl">
            <div className="flex items-center gap-2 mb-4">
              <MessageCircle className="w-5 h-5" />
              <p className="text-xs sm:text-sm font-bold opacity-90">QUESTION OF THE WEEK</p>
            </div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-8">
              What's one thing you learned this week?
            </h2>
            <div className="space-y-3 mb-6">
              <div className="bg-white/20 backdrop-blur-sm rounded-[1.5rem] p-4">
                <p className="text-sm">"How to use CSS Grid effectively!" - Alex</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-[1.5rem] p-4">
                <p className="text-sm">"Better time management techniques" - Sarah</p>
              </div>
            </div>
            <button className="w-full py-3 sm:py-4 rounded-[1.5rem] bg-white text-brand-purple font-bold hover:scale-105 transition-transform">
              Share Your Answer
            </button>
          </div>

          {/* Weekly Playlist */}
          <div className="bg-gradient-to-br from-brand-purple to-brand-purple-light text-white p-6 sm:p-8 lg:p-10 rounded-[2rem] shadow-xl">
            <p className="text-xs sm:text-sm font-bold mb-4 opacity-90">WEEKLY</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-8 text-brand-green" style={{ lineHeight: 0.85 }}>
              PLAYLIST
            </h2>
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-[1.5rem] bg-brand-green flex items-center justify-center mb-6 mx-auto">
              <Music className="w-10 h-10 sm:w-12 sm:h-12 text-brand-purple" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold mb-2">Coding Vibes</h3>
            <p className="text-sm sm:text-base mb-6 opacity-90">Curated by Alex</p>
            <button className="w-full py-3 sm:py-4 rounded-[1.5rem] bg-brand-green text-brand-purple font-bold hover:scale-105 transition-transform flex items-center justify-center gap-2">
              <Play className="w-5 h-5" />
              Play on Spotify
            </button>
          </div>
        </div>

        {/* Archive */}
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-6">Archive</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[
            { name: 'Coding Vibes', author: 'By Alex', time: 'This Week' },
            { name: 'Focus Flow', author: 'By Sarah', time: 'Last Week' },
            { name: 'Creative Energy', author: 'By Mike', time: '2 Weeks Ago' },
            { name: 'Chill Beats', author: 'By Jamie', time: '3 Weeks Ago' },
          ].map((playlist, index) => (
            <div
              key={index}
              className="bg-gradient-to-br from-brand-purple-light via-brand-purple to-brand-electric-orange p-6 sm:p-8 rounded-[2rem] shadow-xl hover:scale-[1.02] transition-transform"
            >
              <div className="aspect-square bg-primary/20 backdrop-blur-sm rounded-[1.5rem] flex items-center justify-center mb-4">
                <Music className="w-12 h-12 sm:w-16 sm:h-16 text-white" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white mb-1">{playlist.name}</h3>
              <p className="text-sm text-white/80 mb-1">{playlist.author}</p>
              <p className="text-xs text-white/60 mb-4">{playlist.time}</p>
              <button className="w-full py-2 sm:py-3 rounded-[1rem] bg-primary text-primary-foreground font-semibold hover:scale-105 transition-transform flex items-center justify-center gap-2">
                <Play className="w-4 h-4" />
                Play
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
