import Link from 'next/link'
import { Users, TrendingUp, Award, CalendarIcon, Cake, Coffee, Palette, Rocket } from 'lucide-react'

export default function TeamPage() {
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
              <Link href="/team" className="text-accent border-b-2 border-accent pb-1">TEAM</Link>
              <Link href="/vibes" className="hover:text-accent transition-colors">VIBES</Link>
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
        <h1 className="text-4xl sm:text-6xl lg:text-8xl font-black text-foreground mb-6 sm:mb-8 lg:mb-12" style={{ lineHeight: 0.85 }}>
          Team
        </h1>

        {/* Team by Numbers */}
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-6">Team by Numbers</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-12">
          <div className="bg-gradient-to-br from-brand-electric-blue to-brand-turquoise text-white p-6 sm:p-8 rounded-[2rem] shadow-xl relative overflow-hidden">
            <Users className="w-8 h-8 sm:w-10 sm:h-10 mb-4" />
            <p className="text-4xl sm:text-5xl lg:text-6xl font-black mb-2" style={{ lineHeight: 0.85 }}>24</p>
            <p className="text-lg sm:text-xl font-semibold">Team Members</p>
            <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
              +2
            </div>
          </div>

          <div className="bg-gradient-to-br from-brand-purple to-brand-purple-light text-white p-6 sm:p-8 rounded-[2rem] shadow-xl relative overflow-hidden">
            <TrendingUp className="w-8 h-8 sm:w-10 sm:h-10 mb-4" />
            <p className="text-4xl sm:text-5xl lg:text-6xl font-black mb-2" style={{ lineHeight: 0.85 }}>12</p>
            <p className="text-lg sm:text-xl font-semibold">Active Projects</p>
            <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
              +3
            </div>
          </div>

          <div className="bg-gradient-to-br from-brand-electric-orange to-brand-orange-alt text-white p-6 sm:p-8 rounded-[2rem] shadow-xl relative overflow-hidden">
            <Award className="w-8 h-8 sm:w-10 sm:h-10 mb-4" />
            <p className="text-4xl sm:text-5xl lg:text-6xl font-black mb-2" style={{ lineHeight: 0.85 }}>247</p>
            <p className="text-lg sm:text-xl font-semibold">Snaps This Month</p>
            <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
              +45
            </div>
          </div>

          <div className="bg-gradient-to-br from-brand-green to-brand-turquoise text-white p-6 sm:p-8 rounded-[2rem] shadow-xl">
            <CalendarIcon className="w-8 h-8 sm:w-10 sm:h-10 mb-4" />
            <p className="text-4xl sm:text-5xl lg:text-6xl font-black mb-2" style={{ lineHeight: 0.85 }}>8</p>
            <p className="text-lg sm:text-xl font-semibold">Upcoming Events</p>
          </div>
        </div>

        {/* Calendar & Events */}
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-6">Calendar & Events</h2>
        <div className="bg-card text-card-foreground p-6 sm:p-8 lg:p-12 rounded-[2rem] shadow-xl">
          {/* Week Header */}
          <div className="grid grid-cols-5 gap-4 mb-8">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Mon</p>
              <p className="text-2xl sm:text-3xl font-bold text-brand-electric-orange">10</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Tue</p>
              <p className="text-2xl sm:text-3xl font-bold">11</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Wed</p>
              <p className="text-2xl sm:text-3xl font-bold">12</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Thu</p>
              <p className="text-2xl sm:text-3xl font-bold">13</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Fri</p>
              <p className="text-2xl sm:text-3xl font-bold">14</p>
            </div>
          </div>

          {/* Events List */}
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center gap-4 p-4 bg-brand-purple/10 rounded-[1.5rem] hover:scale-[1.02] transition-transform">
              <div className="w-12 h-12 shrink-0 rounded-[1rem] bg-brand-purple flex items-center justify-center">
                <Cake className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm sm:text-base">Sarah's Birthday</h4>
                <p className="text-xs sm:text-sm text-muted-foreground">Mon, Feb 10</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-brand-electric-blue/10 rounded-[1.5rem] hover:scale-[1.02] transition-transform">
              <div className="w-12 h-12 shrink-0 rounded-[1rem] bg-brand-electric-blue flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm sm:text-base">Team Standup</h4>
                <p className="text-xs sm:text-sm text-muted-foreground">Mon, Feb 10</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-brand-turquoise/10 rounded-[1.5rem] hover:scale-[1.02] transition-transform">
              <div className="w-12 h-12 shrink-0 rounded-[1rem] bg-brand-turquoise flex items-center justify-center">
                <Coffee className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm sm:text-base">1:1 with Mike</h4>
                <p className="text-xs sm:text-sm text-muted-foreground">Tue, Feb 11</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-brand-violet/10 rounded-[1.5rem] hover:scale-[1.02] transition-transform">
              <div className="w-12 h-12 shrink-0 rounded-[1rem] bg-brand-violet flex items-center justify-center">
                <Palette className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm sm:text-base">Design Review</h4>
                <p className="text-xs sm:text-sm text-muted-foreground">Wed, Feb 12</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-brand-electric-orange/10 rounded-[1.5rem] hover:scale-[1.02] transition-transform">
              <div className="w-12 h-12 shrink-0 rounded-[1rem] bg-brand-electric-orange flex items-center justify-center">
                <Rocket className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm sm:text-base">Alex OOO</h4>
                <p className="text-xs sm:text-sm text-muted-foreground">Thu, Feb 13</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-brand-green/10 rounded-[1.5rem] hover:scale-[1.02] transition-transform">
              <div className="w-12 h-12 shrink-0 rounded-[1rem] bg-brand-green flex items-center justify-center">
                <CalendarIcon className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm sm:text-base">Friday Demo</h4>
                <p className="text-xs sm:text-sm text-muted-foreground">Fri, Feb 14</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
