import Link from 'next/link'
import { Users, Award, TrendingUp, Filter, Calendar } from 'lucide-react'

export default function SnapsPage() {
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
              <Link href="/snaps" className="text-accent border-b-2 border-accent pb-1">SNAPS</Link>
              <Link href="/resources" className="hover:text-accent transition-colors">RESOURCES</Link>
              <Link href="/work" className="hover:text-accent transition-colors">WORK</Link>
              <Link href="/team" className="hover:text-accent transition-colors">TEAM</Link>
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
        {/* Header with Title and Add Button */}
        <div className="flex items-center justify-between mb-8 sm:mb-12">
          <h1 className="text-4xl sm:text-6xl lg:text-8xl font-black text-foreground" style={{ lineHeight: 0.85 }}>
            Snaps
          </h1>
          <button className="px-6 sm:px-8 py-3 sm:py-4 rounded-[2rem] bg-brand-purple text-white font-bold hover:scale-105 transition-transform shadow-xl flex items-center gap-2">
            <span className="text-xl">+</span>
            <span className="hidden sm:inline">Add Snap</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-3 flex flex-col gap-4 sm:gap-6">
            {/* Filters */}
            <div className="bg-primary text-primary-foreground p-6 rounded-[2rem] shadow-xl">
              <h3 className="text-lg sm:text-xl font-bold mb-6 flex items-center gap-2">
                <Filter className="w-5 h-5" />
                FILTERS
              </h3>
              <div className="space-y-3">
                <button className="w-full text-left px-4 py-3 rounded-[1.5rem] bg-brand-purple text-white font-semibold hover:scale-105 transition-transform flex items-center gap-2">
                  <Award className="w-4 h-4 shrink-0" />
                  <span>All Snaps</span>
                </button>
                <button className="w-full text-left px-4 py-3 rounded-[1.5rem] bg-transparent hover:bg-primary-foreground/10 font-semibold transition-colors flex items-center gap-2">
                  <Users className="w-4 h-4 shrink-0" />
                  <span>Snaps About Me</span>
                </button>
                <button className="w-full text-left px-4 py-3 rounded-[1.5rem] bg-transparent hover:bg-primary-foreground/10 font-semibold transition-colors flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 shrink-0" />
                  <span>Snaps I Gave</span>
                </button>
              </div>

              {/* Time Filter */}
              <div className="mt-6 pt-6 border-t border-primary-foreground/20">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4" />
                  <h4 className="font-bold text-sm">Time Filter</h4>
                </div>
                <select className="w-full px-4 py-3 rounded-[1.5rem] bg-card text-card-foreground font-semibold outline-none">
                  <option>All Time</option>
                  <option>This Week</option>
                  <option>This Month</option>
                  <option>This Year</option>
                </select>
              </div>
            </div>

            {/* Stats Card */}
            <div className="bg-gradient-to-br from-brand-electric-orange to-brand-orange-alt text-white p-6 sm:p-8 rounded-[2rem] shadow-xl">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5" />
                <p className="text-xs sm:text-sm font-bold">THIS MONTH</p>
              </div>
              <p className="text-5xl sm:text-6xl font-black mb-4" style={{ lineHeight: 0.85 }}>247</p>
              <p className="text-base sm:text-lg font-semibold mb-6">Total Snaps</p>
              <div className="bg-white/20 backdrop-blur-sm rounded-[1.5rem] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="w-5 h-5" />
                  <p className="font-bold text-sm">Snap Leader</p>
                </div>
                <p className="text-xl sm:text-2xl font-black">Sarah Johnson</p>
                <p className="text-sm opacity-90">42 snaps given</p>
              </div>
            </div>
          </div>

          {/* Snaps Feed */}
          <div className="lg:col-span-9 space-y-4 sm:space-y-6">
            {/* Snap Card 1 */}
            <div className="bg-card text-card-foreground p-6 sm:p-8 rounded-[2rem] shadow-xl hover:scale-[1.01] transition-transform">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 shrink-0 rounded-full bg-brand-purple flex items-center justify-center">
                  <Award className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-bold">Alex Chen</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-bold">Jamie Wilson</span>
                  </div>
                  <p className="text-sm text-muted-foreground">2 hours ago</p>
                </div>
              </div>
              <p className="text-base sm:text-lg">
                Your presentation was absolutely phenomenal! The way you explained the complex concepts was so clear.
              </p>
            </div>

            {/* Snap Card 2 - Anonymous */}
            <div className="bg-card text-card-foreground p-6 sm:p-8 rounded-[2rem] shadow-xl hover:scale-[1.01] transition-transform relative">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 shrink-0 rounded-full bg-brand-purple flex items-center justify-center">
                  <Award className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-bold">Anonymous</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-bold">Sarah Miller</span>
                  </div>
                  <p className="text-sm text-muted-foreground">5 hours ago</p>
                </div>
              </div>
              <p className="text-base sm:text-lg">
                Thanks for always being so helpful and patient with everyone!
              </p>
              <div className="absolute top-6 right-6 px-3 py-1 bg-brand-purple/10 rounded-full">
                <p className="text-xs font-bold text-brand-purple flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  Anonymous
                </p>
              </div>
            </div>

            {/* Snap Card 3 */}
            <div className="bg-card text-card-foreground p-6 sm:p-8 rounded-[2rem] shadow-xl hover:scale-[1.01] transition-transform">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 shrink-0 rounded-full bg-brand-purple flex items-center justify-center">
                  <Award className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-bold">Mike Davis</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-bold">Chris Taylor</span>
                  </div>
                  <p className="text-sm text-muted-foreground">1 day ago</p>
                </div>
              </div>
              <p className="text-base sm:text-lg">
                That code review was super helpful. I learned a lot!
              </p>
            </div>

            {/* Snap Card 4 */}
            <div className="bg-card text-card-foreground p-6 sm:p-8 rounded-[2rem] shadow-xl hover:scale-[1.01] transition-transform">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 shrink-0 rounded-full bg-brand-purple flex items-center justify-center">
                  <Award className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-bold">Taylor Brown</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-bold">Alex Chen</span>
                  </div>
                  <p className="text-sm text-muted-foreground">2 days ago</p>
                </div>
              </div>
              <p className="text-base sm:text-lg">
                Great job organizing the team event. Everyone had a blast!
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
