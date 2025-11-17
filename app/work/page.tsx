import Link from 'next/link'
import { Users, Clock, TrendingUp, Calendar, Briefcase, Hammer } from 'lucide-react'

export default function WorkPage() {
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
              <Link href="/work" className="text-accent border-b-2 border-accent pb-1">WORK</Link>
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
        {/* Page Title */}
        <h1 className="text-4xl sm:text-6xl lg:text-8xl font-black text-foreground mb-6 sm:mb-8 lg:mb-12" style={{ lineHeight: 0.85 }}>
          Work
        </h1>

        {/* Tabs */}
        <div className="flex gap-3 sm:gap-4 mb-6 sm:mb-8 lg:mb-12">
          <button className="px-6 sm:px-8 lg:px-10 py-3 sm:py-4 rounded-[2rem] bg-accent text-accent-foreground font-bold text-sm sm:text-base lg:text-lg hover:scale-105 transition-transform shadow-xl">
            Pipeline
          </button>
          <button className="px-6 sm:px-8 lg:px-10 py-3 sm:py-4 rounded-[2rem] bg-card text-card-foreground font-bold text-sm sm:text-base lg:text-lg hover:scale-105 transition-transform shadow-xl">
            Showcase
          </button>
        </div>

        {/* Pipeline Kanban Board */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* New Business Column */}
          <div className="flex flex-col gap-4 sm:gap-6">
            <div className="bg-gradient-to-br from-brand-electric-orange to-brand-orange-alt text-white p-6 sm:p-8 rounded-[2rem] shadow-xl">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black mb-2" style={{ lineHeight: 0.85 }}>
                New Business
              </h2>
              <p className="text-5xl sm:text-6xl lg:text-7xl font-black" style={{ lineHeight: 0.85 }}>2</p>
            </div>

            {/* Project Cards */}
            <div className="bg-card text-card-foreground p-6 sm:p-8 rounded-[2rem] shadow-xl hover:scale-[1.02] transition-transform">
              <h3 className="text-xl sm:text-2xl font-bold mb-2">Acme Corp</h3>
              <p className="text-muted-foreground mb-6">Website Redesign</p>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 shrink-0" />
                  <span>Alex, Sarah</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>2 weeks</span>
                </div>
              </div>
            </div>

            <div className="bg-card text-card-foreground p-6 sm:p-8 rounded-[2rem] shadow-xl hover:scale-[1.02] transition-transform">
              <h3 className="text-xl sm:text-2xl font-bold mb-2">Tech Startup</h3>
              <p className="text-muted-foreground mb-6">Brand Identity</p>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 shrink-0" />
                  <span>Mike</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>1 month</span>
                </div>
              </div>
            </div>
          </div>

          {/* In Progress Column */}
          <div className="flex flex-col gap-4 sm:gap-6">
            <div className="bg-gradient-to-br from-brand-electric-blue to-brand-turquoise text-white p-6 sm:p-8 rounded-[2rem] shadow-xl">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black mb-2" style={{ lineHeight: 0.85 }}>
                In Progress
              </h2>
              <p className="text-5xl sm:text-6xl lg:text-7xl font-black" style={{ lineHeight: 0.85 }}>2</p>
            </div>

            {/* Project Cards */}
            <div className="bg-card text-card-foreground p-6 sm:p-8 rounded-[2rem] shadow-xl hover:scale-[1.02] transition-transform">
              <h3 className="text-xl sm:text-2xl font-bold mb-2">Fashion Brand</h3>
              <p className="text-muted-foreground mb-6">E-commerce</p>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 shrink-0" />
                  <span>Chris, Taylor</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>3 weeks left</span>
                </div>
              </div>
            </div>

            <div className="bg-card text-card-foreground p-6 sm:p-8 rounded-[2rem] shadow-xl hover:scale-[1.02] transition-transform">
              <h3 className="text-xl sm:text-2xl font-bold mb-2">Food App</h3>
              <p className="text-muted-foreground mb-6">Mobile App</p>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 shrink-0" />
                  <span>Jamie</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>1 week left</span>
                </div>
              </div>
            </div>
          </div>

          {/* Completed Column */}
          <div className="flex flex-col gap-4 sm:gap-6">
            <div className="bg-gradient-to-br from-brand-green to-brand-turquoise text-white p-6 sm:p-8 rounded-[2rem] shadow-xl">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black mb-2" style={{ lineHeight: 0.85 }}>
                Completed
              </h2>
              <p className="text-5xl sm:text-6xl lg:text-7xl font-black" style={{ lineHeight: 0.85 }}>2</p>
            </div>

            {/* Project Cards */}
            <div className="bg-card text-card-foreground p-6 sm:p-8 rounded-[2rem] shadow-xl hover:scale-[1.02] transition-transform">
              <h3 className="text-xl sm:text-2xl font-bold mb-2">Finance Co</h3>
              <p className="text-muted-foreground mb-6">Dashboard</p>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 shrink-0" />
                  <span>Alex, Mike</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>Last week</span>
                </div>
              </div>
            </div>

            <div className="bg-card text-card-foreground p-6 sm:p-8 rounded-[2rem] shadow-xl hover:scale-[1.02] transition-transform">
              <h3 className="text-xl sm:text-2xl font-bold mb-2">Travel Site</h3>
              <p className="text-muted-foreground mb-6">Booking Flow</p>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 shrink-0" />
                  <span>Sarah</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>2 weeks ago</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
