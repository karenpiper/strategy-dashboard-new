import Link from 'next/link'
import { Users, Search, BookOpen, ExternalLink } from 'lucide-react'

export default function ResourcesPage() {
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
              <Link href="/resources" className="text-accent border-b-2 border-accent pb-1">RESOURCES</Link>
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
        {/* Page Title */}
        <h1 className="text-4xl sm:text-6xl lg:text-8xl font-black text-foreground mb-6 sm:mb-8 lg:mb-12" style={{ lineHeight: 0.85 }}>
          Resources
        </h1>

        {/* Search Bar */}
        <div className="bg-card rounded-[2rem] p-2 sm:p-3 shadow-xl mb-6 sm:mb-8 flex items-center gap-3">
          <input
            type="text"
            placeholder="Search resources..."
            className="flex-1 bg-transparent px-4 py-3 sm:py-4 text-base sm:text-lg outline-none text-card-foreground"
          />
          <button className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-[1.5rem] bg-accent flex items-center justify-center hover:scale-110 transition-transform">
            <Search className="w-5 h-5 sm:w-6 sm:h-6 text-accent-foreground" />
          </button>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-3 sm:gap-4 mb-8 sm:mb-12">
          <button className="px-6 sm:px-8 py-3 sm:py-4 rounded-[2rem] bg-accent text-accent-foreground font-bold text-sm sm:text-base hover:scale-105 transition-transform">
            All
          </button>
          <button className="px-6 sm:px-8 py-3 sm:py-4 rounded-[2rem] bg-card text-card-foreground font-semibold text-sm sm:text-base hover:scale-105 transition-transform">
            Communication
          </button>
          <button className="px-6 sm:px-8 py-3 sm:py-4 rounded-[2rem] bg-card text-card-foreground font-semibold text-sm sm:text-base hover:scale-105 transition-transform">
            Creative
          </button>
          <button className="px-6 sm:px-8 py-3 sm:py-4 rounded-[2rem] bg-card text-card-foreground font-semibold text-sm sm:text-base hover:scale-105 transition-transform">
            Learning
          </button>
          <button className="px-6 sm:px-8 py-3 sm:py-4 rounded-[2rem] bg-card text-card-foreground font-semibold text-sm sm:text-base hover:scale-105 transition-transform">
            Research
          </button>
          <button className="px-6 sm:px-8 py-3 sm:py-4 rounded-[2rem] bg-card text-card-foreground font-semibold text-sm sm:text-base hover:scale-105 transition-transform">
            Strategy
          </button>
          <button className="px-6 sm:px-8 py-3 sm:py-4 rounded-[2rem] bg-card text-card-foreground font-semibold text-sm sm:text-base hover:scale-105 transition-transform">
            Tools
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
          {/* Main Resources Grid */}
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {/* Resource Card 1 */}
            <div className="bg-card text-card-foreground p-6 sm:p-8 rounded-[2rem] shadow-xl hover:scale-[1.02] transition-transform relative overflow-hidden">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-[1rem] bg-brand-indigo/20 flex items-center justify-center mb-4">
                <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-brand-indigo" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold mb-2 text-brand-indigo">Brand Guidelines 2024</h3>
              <p className="text-sm sm:text-base text-muted-foreground mb-6">Complete guide to our visual identity and brand standards</p>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="px-3 py-1 bg-secondary rounded-full text-xs font-semibold">Creative</span>
                <span className="px-3 py-1 bg-secondary rounded-full text-xs font-semibold">Strategy</span>
              </div>
              <button className="absolute top-6 right-6 w-8 h-8 rounded-lg bg-brand-indigo/10 flex items-center justify-center hover:bg-brand-indigo/20 transition-colors">
                <ExternalLink className="w-4 h-4 text-brand-indigo" />
              </button>
            </div>

            {/* Resource Card 2 */}
            <div className="bg-card text-card-foreground p-6 sm:p-8 rounded-[2rem] shadow-xl hover:scale-[1.02] transition-transform relative overflow-hidden">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-[1rem] bg-brand-indigo/20 flex items-center justify-center mb-4">
                <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-brand-indigo" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold mb-2">Client Communication Templates</h3>
              <p className="text-sm sm:text-base text-muted-foreground mb-6">Email templates for common client scenarios</p>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="px-3 py-1 bg-secondary rounded-full text-xs font-semibold">Communication</span>
                <span className="px-3 py-1 bg-secondary rounded-full text-xs font-semibold">Tools</span>
              </div>
              <button className="absolute top-6 right-6 w-8 h-8 rounded-lg bg-brand-indigo/10 flex items-center justify-center hover:bg-brand-indigo/20 transition-colors">
                <ExternalLink className="w-4 h-4 text-brand-indigo" />
              </button>
            </div>

            {/* Resource Card 3 */}
            <div className="bg-card text-card-foreground p-6 sm:p-8 rounded-[2rem] shadow-xl hover:scale-[1.02] transition-transform relative overflow-hidden">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-[1rem] bg-brand-indigo/20 flex items-center justify-center mb-4">
                <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-brand-indigo" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold mb-2">UX Research Methods</h3>
              <p className="text-sm sm:text-base text-muted-foreground mb-6">Comprehensive guide to user research techniques</p>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="px-3 py-1 bg-secondary rounded-full text-xs font-semibold">Research</span>
                <span className="px-3 py-1 bg-secondary rounded-full text-xs font-semibold">Learning</span>
              </div>
              <button className="absolute top-6 right-6 w-8 h-8 rounded-lg bg-brand-indigo/10 flex items-center justify-center hover:bg-brand-indigo/20 transition-colors">
                <ExternalLink className="w-4 h-4 text-brand-indigo" />
              </button>
            </div>

            {/* Resource Card 4 */}
            <div className="bg-card text-card-foreground p-6 sm:p-8 rounded-[2rem] shadow-xl hover:scale-[1.02] transition-transform relative overflow-hidden">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-[1rem] bg-brand-indigo/20 flex items-center justify-center mb-4">
                <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-brand-indigo" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold mb-2">Design System Documentation</h3>
              <p className="text-sm sm:text-base text-muted-foreground mb-6">Component library and usage guidelines</p>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="px-3 py-1 bg-secondary rounded-full text-xs font-semibold">Creative</span>
                <span className="px-3 py-1 bg-secondary rounded-full text-xs font-semibold">Tools</span>
              </div>
              <button className="absolute top-6 right-6 w-8 h-8 rounded-lg bg-brand-indigo/10 flex items-center justify-center hover:bg-brand-indigo/20 transition-colors">
                <ExternalLink className="w-4 h-4 text-brand-indigo" />
              </button>
            </div>

            {/* Resource Card 5 */}
            <div className="bg-card text-card-foreground p-6 sm:p-8 rounded-[2rem] shadow-xl hover:scale-[1.02] transition-transform relative overflow-hidden">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-[1rem] bg-brand-indigo/20 flex items-center justify-center mb-4">
                <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-brand-indigo" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold mb-2">Project Kickoff Checklist</h3>
              <p className="text-sm sm:text-base text-muted-foreground mb-6">Everything you need to start a new project</p>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="px-3 py-1 bg-secondary rounded-full text-xs font-semibold">Strategy</span>
                <span className="px-3 py-1 bg-secondary rounded-full text-xs font-semibold">Tools</span>
              </div>
              <button className="absolute top-6 right-6 w-8 h-8 rounded-lg bg-brand-indigo/10 flex items-center justify-center hover:bg-brand-indigo/20 transition-colors">
                <ExternalLink className="w-4 h-4 text-brand-indigo" />
              </button>
            </div>

            {/* Resource Card 6 */}
            <div className="bg-card text-card-foreground p-6 sm:p-8 rounded-[2rem] shadow-xl hover:scale-[1.02] transition-transform relative overflow-hidden">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-[1rem] bg-brand-indigo/20 flex items-center justify-center mb-4">
                <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-brand-indigo" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold mb-2">Figma Tips & Tricks</h3>
              <p className="text-sm sm:text-base text-muted-foreground mb-6">Advanced techniques for efficient design work</p>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="px-3 py-1 bg-secondary rounded-full text-xs font-semibold">Creative</span>
                <span className="px-3 py-1 bg-secondary rounded-full text-xs font-semibold">Learning</span>
              </div>
              <button className="absolute top-6 right-6 w-8 h-8 rounded-lg bg-brand-indigo/10 flex items-center justify-center hover:bg-brand-indigo/20 transition-colors">
                <ExternalLink className="w-4 h-4 text-brand-indigo" />
              </button>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 flex flex-col gap-4 sm:gap-6">
            {/* Recently Viewed */}
            <div className="bg-primary text-primary-foreground p-6 sm:p-8 rounded-[2rem] shadow-xl">
              <h3 className="text-xl sm:text-2xl font-bold mb-6">Recently Viewed</h3>
              <div className="space-y-3">
                <div className="text-sm sm:text-base hover:text-accent transition-colors cursor-pointer">Brand Guidelines 2024</div>
                <div className="text-sm sm:text-base hover:text-accent transition-colors cursor-pointer">Client Communication Templates</div>
                <div className="text-sm sm:text-base hover:text-accent transition-colors cursor-pointer">UX Research Methods</div>
              </div>
            </div>

            {/* Most Used */}
            <div className="bg-gradient-to-br from-brand-purple to-brand-purple-light text-white p-6 sm:p-8 rounded-[2rem] shadow-xl">
              <h3 className="text-xl sm:text-2xl font-bold mb-6">Most Used</h3>
              <div className="bg-white/20 backdrop-blur-sm rounded-[1.5rem] p-4 mb-4">
                <h4 className="font-bold mb-1">Brand Guidelines</h4>
                <p className="text-sm opacity-90">124 views this month</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
