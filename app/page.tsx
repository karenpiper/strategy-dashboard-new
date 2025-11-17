import { Search, Calendar, Music, FileText, MessageCircle, Trophy, TrendingUp, Users, Zap, Star, Clock, ArrowRight, Play, CheckCircle, Video, Sparkles, ChevronRight, Lightbulb } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from 'next/link'

export default function TeamDashboard() {
  return (
    <div className="min-h-screen bg-black">
      <header className="border-b border-brand-yellow/20 px-4 md:px-6 lg:px-8 py-6 bg-black">
        <div className="max-w-[2000px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6 md:gap-12">
            <Link href="/" className="w-14 h-14 md:w-16 md:h-16 bg-brand-yellow rounded-3xl flex items-center justify-center font-black text-black text-2xl hover:scale-110 transition-transform">
              D
            </Link>
            <nav className="hidden md:flex items-center gap-8 lg:gap-12 text-sm font-black">
              <Link href="/" className="text-brand-yellow tracking-[0.15em] uppercase hover:text-white transition-colors relative pb-1 border-b-4 border-brand-yellow">HOME</Link>
              <Link href="/snaps" className="text-white/60 hover:text-brand-yellow transition-colors tracking-[0.15em] uppercase">SNAPS</Link>
              <Link href="/resources" className="text-white/60 hover:text-brand-yellow transition-colors tracking-[0.15em] uppercase">RESOURCES</Link>
              <Link href="/work" className="text-white/60 hover:text-brand-yellow transition-colors tracking-[0.15em] uppercase">WORK</Link>
              <Link href="/team" className="text-white/60 hover:text-brand-yellow transition-colors tracking-[0.15em] uppercase">TEAM</Link>
              <Link href="/vibes" className="text-white/60 hover:text-brand-yellow transition-colors tracking-[0.15em] uppercase">VIBES</Link>
            </nav>
          </div>
          <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-brand-purple to-brand-violet rounded-full border-4 border-brand-yellow" />
        </div>
      </header>

      <main className="max-w-[2000px] mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-12 lg:py-16 space-y-8 md:space-y-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          <section className="lg:col-span-2 relative overflow-hidden rounded-[40px] bg-gradient-to-br from-brand-yellow via-brand-orange-alt to-brand-coral p-8 md:p-12 min-h-[500px] flex flex-col justify-between animate-slide-up">
            <div className="absolute top-0 right-0 w-1/2 h-full bg-black rounded-[40px] transform translate-x-1/4 -rotate-12"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-6">
                <div className="bg-black px-4 md:px-6 py-2 md:py-3 rounded-full">
                  <p className="text-brand-yellow font-black text-xs md:text-sm tracking-[0.2em] uppercase">Quick Actions</p>
                </div>
              </div>
              <h1 className="text-[clamp(3rem,8vw+1rem,10rem)] leading-[0.85] font-black text-black mb-4 md:mb-6 uppercase">
                READY!
              </h1>
              <p className="text-[clamp(1.25rem,3vw+0.5rem,2.5rem)] font-bold text-black max-w-2xl leading-tight">
                Let's ship something amazing today
              </p>
              <p className="text-base md:text-lg lg:text-xl text-black/70 font-bold mt-4">Friday, November 14</p>
            </div>
            <div className="relative z-10 flex items-center gap-3 md:gap-4 flex-wrap">
              {['Give Snap', 'Need Help', 'Add Win'].map((label) => (
                <button key={label} className="bg-black text-brand-yellow py-3 md:py-4 px-6 md:px-8 rounded-full text-base md:text-lg font-black hover:scale-105 transition-all hover:shadow-2xl uppercase tracking-wider">
                  {label} →
                </button>
              ))}
            </div>
          </section>

          <div className="bg-gradient-to-br from-brand-purple via-brand-violet to-brand-purple-light p-8 md:p-10 rounded-[40px] flex flex-col items-center justify-center text-center hover:scale-105 transition-all duration-300 animate-slide-up min-h-[400px]">
            <div className="w-24 h-24 bg-brand-yellow rounded-full flex items-center justify-center mb-6 animate-float">
              <Zap className="w-12 h-12 text-black" />
            </div>
            <p className="text-brand-yellow/80 font-black text-sm tracking-[0.2em] uppercase mb-4">Launch Pad</p>
            <h2 className="text-[clamp(2rem,4vw+0.5rem,6rem)] leading-[0.85] font-black text-white uppercase">QUICK<br/>ACTIONS</h2>
          </div>
        </div>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {/* Horoscope */}
          <div className="bg-gradient-to-br from-[#4A0E5A] to-brand-purple p-8 md:p-10 rounded-[40px] hover:scale-105 transition-all duration-300 animate-slide-up min-h-[400px] flex flex-col overflow-hidden">
            <div className="flex items-center gap-3 mb-4 shrink-0">
              <Sparkles className="w-5 h-5 shrink-0 text-brand-yellow" />
              <span className="text-white/60 font-black text-xs tracking-[0.2em] uppercase">Totally Real</span>
            </div>
            <h2 className="text-[clamp(2rem,4vw,3.5rem)] leading-[0.9] font-black text-brand-yellow mb-6 uppercase break-words">YOUR<br/>HOROSCOPE</h2>
            <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-5 flex-1 border-2 border-brand-purple/30 overflow-hidden">
              <p className="text-xs md:text-sm font-black text-brand-yellow mb-3 uppercase tracking-wider">CANCER</p>
              <p className="text-sm md:text-base text-white leading-relaxed font-medium break-words">Mars aligns with your keyboard. Expect typos. So many typos. Idk stars have speelin.</p>
            </div>
          </div>

          {/* Weather */}
          <div className="bg-gradient-to-br from-brand-electric-blue to-brand-turquoise p-8 md:p-10 rounded-[40px] relative overflow-hidden hover:scale-105 transition-all duration-300 animate-slide-up min-h-[400px] flex flex-col">
            <div className="flex items-center gap-3 mb-4 relative z-10 shrink-0">
              <span className="text-white/80 font-black text-xs tracking-[0.2em] uppercase">Right Now</span>
            </div>
            <h2 className="text-[clamp(2rem,4vw,3.5rem)] leading-[0.9] font-black text-white mb-6 uppercase relative z-10 break-words">WEATHER</h2>
            <div className="mb-6 relative z-10 flex-1 flex flex-col justify-center overflow-hidden">
              <p className="text-[clamp(3rem,10vw,6rem)] leading-[0.9] font-black text-white mb-2 break-words">72°</p>
              <p className="text-lg md:text-xl text-white font-bold break-words">Partly Cloudy</p>
              <p className="text-sm md:text-base text-white/70 font-medium mt-2 break-words">Your Location</p>
            </div>
            <div className="absolute top-12 right-12 text-white/20 text-7xl md:text-9xl pointer-events-none">☁️</div>
            <div className="absolute bottom-40 right-20 text-white text-7xl md:text-9xl pointer-events-none">☁️</div>
            <div className="grid grid-cols-2 gap-3 md:gap-4 relative z-10 shrink-0">
              {[{ label: 'Humidity', val: '65%' }, { label: 'Wind', val: '8 mph' }].map((stat, i) => (
                <div key={i} className="bg-black/30 backdrop-blur-md rounded-2xl p-4 md:p-5 border-2 border-white/20 overflow-hidden">
                  <p className="text-xs md:text-sm text-white/70 font-bold uppercase tracking-wider truncate">{stat.label}</p>
                  <p className="text-2xl md:text-3xl font-black text-white mt-1 break-words">{stat.val}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Time Zones */}
          <div className="bg-black p-8 md:p-10 rounded-[40px] border-4 border-brand-turquoise hover:scale-105 transition-all duration-300 animate-slide-up min-h-[400px] flex flex-col overflow-hidden">
            <div className="flex items-center gap-3 mb-4 shrink-0">
              <div className="w-10 h-10 md:w-12 md:h-12 shrink-0 bg-brand-turquoise rounded-2xl flex items-center justify-center">
                <Clock className="w-5 h-5 md:w-6 md:h-6 text-black" />
              </div>
              <span className="text-brand-turquoise font-black text-xs tracking-[0.2em] uppercase">Global Team</span>
            </div>
            <h2 className="text-[clamp(2rem,4vw,3.5rem)] leading-[0.9] font-black text-white mb-6 uppercase break-words">TIME<br/>ZONES</h2>
            <div className="space-y-3 md:space-y-4 flex-1 overflow-y-auto">
              {[
                { emoji: '🌉', city: 'San Francisco', status: '🌙 Sleeping', time: '12:50 AM', color: 'brand-electric-blue' },
                { emoji: '🗽', city: 'New York', status: '🌙 Sleeping', time: '03:50 AM', color: 'brand-green' },
                { emoji: '🏰', city: 'London', status: '🌙 Sleeping', time: '08:50 AM', color: 'brand-purple' },
                { emoji: '🗼', city: 'Tokyo', status: '🌃 Evening', time: '05:50 PM', color: 'brand-turquoise' },
                { emoji: '🏖️', city: 'Sydney', status: '🌃 Evening', time: '07:50 PM', color: 'brand-coral' }
              ].map((zone, i) => (
                <div key={i} className={`flex items-center justify-between p-4 bg-${zone.color}/20 rounded-3xl border-2 border-${zone.color}/40`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 bg-${zone.color} rounded-2xl flex items-center justify-center text-xl`}>{zone.emoji}</div>
                    <div>
                      <p className="text-white font-black text-base">{zone.city}</p>
                      <p className="text-white/60 text-xs font-medium">{zone.status}</p>
                    </div>
                  </div>
                  <span className="text-white font-black text-sm">{zone.time}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-center gap-4 mb-8">
            <div className="h-2 bg-gradient-to-r from-brand-green via-brand-orange to-brand-yellow rounded-full flex-1"></div>
          </div>
          <h2 className="text-[clamp(2rem,4vw,4rem)] font-black text-white mb-8 uppercase tracking-tight">Work Updates</h2>
          
          {/* Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 mb-6 md:mb-8">
            {/* Playlist */}
            <div className="bg-brand-orange p-8 md:p-10 rounded-[40px] hover:scale-105 transition-all duration-300 animate-slide-up">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center">
                  <Music className="w-6 h-6 text-brand-orange" />
                </div>
                <span className="text-black/60 font-black text-xs tracking-[0.2em] uppercase">Weekly</span>
              </div>
              <h3 className="text-[clamp(2.5rem,5vw,4rem)] leading-[0.85] font-black text-black mb-8 uppercase">PLAYLIST</h3>
              <div className="flex items-center justify-center mb-6">
                <div className="w-24 h-24 bg-black rounded-3xl flex items-center justify-center">
                  <Music className="w-12 h-12 text-brand-orange" />
                </div>
              </div>
              <p className="text-xl font-black text-black mb-2">Coding Vibes</p>
              <p className="text-sm text-black/70 font-medium mb-6">Curated by Alex</p>
              <button className="w-full bg-black text-brand-orange py-4 rounded-full text-base font-black hover:scale-105 transition-all uppercase flex items-center justify-center gap-2">
                <Play className="w-5 h-5" /> Play on Spotify
              </button>
            </div>

            {/* The Friday Drop */}
            <div className="bg-brand-turquoise p-8 md:p-10 rounded-[40px] hover:scale-105 transition-all duration-300 animate-slide-up">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-brand-turquoise" />
                </div>
                <span className="text-black/60 font-black text-xs tracking-[0.2em] uppercase">Weekly Report</span>
              </div>
              <h3 className="text-[clamp(2.5rem,5vw,4rem)] leading-[0.85] font-black text-black mb-8 uppercase">THE<br/>FRIDAY<br/>DROP</h3>
              <div className="grid grid-cols-3 gap-4 mb-4">
                {[{ num: '5', label: 'NEW' }, { num: '8', label: 'SHIPPED' }, { num: '12', label: 'IN QA' }].map((stat, i) => (
                  <div key={i} className="bg-black/30 backdrop-blur-sm rounded-2xl p-4 text-center">
                    <p className="text-3xl font-black text-black">{stat.num}</p>
                    <p className="text-xs font-bold text-black/70 uppercase">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Featured Drop */}
            <div className="bg-gradient-to-br from-[#E56DB1] to-[#F498C6] p-8 md:p-10 rounded-[40px] hover:scale-105 transition-all duration-300 animate-slide-up">
              <div className="bg-black px-4 py-2 rounded-full inline-block mb-4">
                <p className="text-[#E56DB1] font-black text-xs tracking-[0.2em] uppercase">Featured</p>
              </div>
              <div className="mb-6">
                <p className="text-xs font-bold text-black/60 uppercase mb-2">Active Drop</p>
                <h3 className="text-[clamp(2rem,4vw,3rem)] leading-[0.9] font-black text-black mb-2 uppercase">Brand<br/>Redesign</h3>
                <div className="inline-block bg-white/40 px-3 py-1 rounded-full">
                  <p className="text-xs font-black text-black">Branding</p>
                </div>
              </div>
              <div className="flex justify-end">
                <span className="text-6xl">🎨</span>
              </div>
            </div>

            {/* Stats */}
            <div className="bg-white p-8 md:p-10 rounded-[40px] hover:scale-105 transition-all duration-300 animate-slide-up">
              <div className="bg-black px-4 py-2 rounded-full inline-block mb-4">
                <p className="text-brand-yellow font-black text-xs tracking-[0.2em] uppercase">This Month</p>
              </div>
              <h3 className="text-[clamp(2.5rem,5vw,4rem)] leading-[0.85] font-black text-black mb-8 uppercase">STATS</h3>
              <div className="space-y-6">
                {[
                  { num: '24', label: 'Team', color: 'black' },
                  { num: '247', label: 'Snaps', color: 'black' },
                  { num: '+15%', label: 'Growth', color: 'text-brand-green' }
                ].map((stat, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-black/60 font-bold text-base uppercase tracking-wider">{stat.label}</span>
                    <span className={`text-[clamp(2.5rem,5vw,4rem)] leading-none font-black ${stat.color}`}>{stat.num}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {/* Events */}
            <div className="bg-black p-8 md:p-10 rounded-[40px] border-4 border-brand-green hover:scale-105 transition-all duration-300 animate-slide-up">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-brand-green rounded-2xl flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-black" />
                </div>
                <span className="text-brand-green font-black text-sm tracking-[0.2em] uppercase">Today</span>
              </div>
              <h2 className="text-[clamp(2rem,5vw+0.5rem,6rem)] leading-[0.85] font-black text-white mb-6 md:mb-8 uppercase">EVENTS</h2>
              <div className="space-y-4">
                {[{ time: '10:30', label: 'Team Standup' }, { time: '14:00', label: 'Design Review' }].map((event, i) => (
                  <div key={i} className="bg-brand-green/20 backdrop-blur-sm rounded-3xl p-5 border-2 border-brand-green/40 hover:border-brand-green transition-all">
                    <div className="flex items-center gap-3 text-white">
                      <Clock className="w-5 h-5 text-brand-green shrink-0" />
                      <span className="font-bold text-lg">{event.time}</span>
                      <span className="font-medium">{event.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pipeline */}
            <div className="bg-brand-green p-8 md:p-10 rounded-[40px] hover:scale-105 transition-all duration-300 animate-slide-up">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-brand-green" />
                </div>
                <span className="text-black/60 font-black text-xs tracking-[0.2em] uppercase">Work</span>
              </div>
              <h3 className="text-[clamp(2.5rem,5vw,4rem)] leading-[0.85] font-black text-black mb-8 uppercase">PIPELINE</h3>
              <div className="space-y-4">
                {[
                  { label: 'New Business', icon: FileText, num: '12', color: 'brand-yellow' },
                  { label: 'In Progress', icon: Zap, num: '8', color: 'brand-purple' },
                  { label: 'Completed', icon: CheckCircle, num: '24', color: 'brand-green' }
                ].map((item, i) => {
                  const Icon = item.icon
                  return (
                    <div key={i} className="bg-black rounded-3xl p-5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 bg-${item.color} rounded-2xl flex items-center justify-center`}>
                          <Icon className="w-5 h-5 text-black" />
                        </div>
                        <span className="font-bold text-white">{item.label}</span>
                      </div>
                      <span className={`text-2xl font-black text-${item.color}`}>{item.num}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Who Needs What */}
            <div className="bg-brand-yellow p-8 md:p-10 rounded-[40px] hover:scale-105 transition-all duration-300 animate-slide-up">
              <div className="bg-black px-4 py-2 rounded-full inline-block mb-6">
                <p className="text-brand-yellow font-black text-xs tracking-[0.2em] uppercase">Recent Requests</p>
              </div>
              <h2 className="text-[clamp(2rem,5vw+0.5rem,6rem)] leading-[0.85] font-black text-black mb-6 md:mb-8 uppercase">WHO<br/>NEEDS<br/>WHAT</h2>
              <div className="space-y-4 mb-6">
                {[{ name: 'Alex', task: 'Design Review', badge: '😊' }, { name: 'Sarah', task: 'Code Help', badge: '💻' }].map((item, i) => (
                  <div key={i} className="bg-black rounded-3xl p-5 flex items-center justify-between">
                    <div>
                      <p className="font-black text-brand-yellow text-lg">{item.name}</p>
                      <p className="text-white/80 text-sm font-medium">{item.task}</p>
                    </div>
                    <div className="w-12 h-12 bg-brand-yellow rounded-full flex items-center justify-center">
                      <span className="font-black text-black text-lg">{item.badge}</span>
                    </div>
                  </div>
                ))}
              </div>
              <button className="w-full bg-black text-brand-yellow py-5 rounded-full text-lg font-black hover:scale-105 transition-all uppercase tracking-wider">
                CLAIM REQUEST
              </button>
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-center gap-4 mb-8">
            <div className="h-2 bg-gradient-to-r from-brand-purple via-brand-violet to-brand-coral rounded-full flex-1"></div>
          </div>
          <h2 className="text-[clamp(2rem,4vw,4rem)] font-black text-white mb-8 uppercase tracking-tight">Recognition & Culture</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {/* Snaps (2-column span) */}
            <div className="lg:col-span-2 bg-black p-8 md:p-10 rounded-[40px] border-4 border-brand-purple hover:scale-105 transition-all duration-300 animate-slide-up">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-brand-purple rounded-2xl flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-brand-yellow" />
                </div>
                <span className="text-brand-purple font-black text-xs tracking-[0.2em] uppercase">Recent Recognition</span>
              </div>
              <h3 className="text-[clamp(2.5rem,5vw,4rem)] leading-[0.85] font-black text-brand-yellow mb-6 uppercase">SNAPS</h3>
              <div className="space-y-4 mb-6">
                {[
                  { from: 'Alex', to: 'Jamie', msg: 'Amazing presentation! The client loved it', color: 'brand-green' },
                  { from: 'Sarah', to: 'Mike', msg: 'Thanks for the code review help today', color: 'brand-purple' },
                  { from: 'Chris', to: 'Taylor', msg: 'Great design work on the new landing page', color: 'brand-coral' }
                ].map((snap, i) => (
                  <div key={i} className="bg-brand-purple/10 rounded-2xl p-4 border-2 border-brand-purple/30">
                    <p className="font-black text-white text-sm mb-1">{snap.from} → {snap.to}</p>
                    <p className="text-white/70 text-xs font-medium">{snap.msg}</p>
                  </div>
                ))}
              </div>
              <button className="w-full bg-gradient-to-r from-brand-purple to-brand-violet text-white py-4 rounded-full text-base font-black hover:scale-105 transition-all uppercase">
                + Give a Snap
              </button>
            </div>

            {/* Beast Babe */}
            <div className="bg-gradient-to-br from-brand-coral to-brand-coral-light p-8 md:p-10 rounded-[40px] text-center hover:scale-105 transition-all duration-300 animate-slide-up">
              <div className="bg-black px-4 py-2 rounded-full inline-block mb-4">
                <p className="text-brand-yellow font-black text-xs tracking-[0.2em] uppercase">This Week's</p>
              </div>
              <h3 className="text-[clamp(2.5rem,5vw,4rem)] leading-[0.85] font-black text-white mb-6 uppercase">BEAST<br/>BABE</h3>
              <div className="flex items-center justify-center mb-6">
                <div className="w-24 h-24 bg-brand-yellow rounded-full flex items-center justify-center animate-pulse-glow">
                  <Trophy className="w-12 h-12 text-brand-coral" />
                </div>
              </div>
              <p className="text-[clamp(2rem,4vw,3rem)] leading-[0.85] font-black text-white uppercase mb-2">Sarah J.</p>
              <p className="text-lg font-bold text-white/80">42 Snaps Received</p>
            </div>

            {/* Wins Wall */}
            <div className="bg-white p-8 md:p-10 rounded-[40px] hover:scale-105 transition-all duration-300 animate-slide-up">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-brand-orange rounded-2xl flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-black" />
                </div>
                <span className="text-black/60 font-black text-xs tracking-[0.2em] uppercase">Celebrate</span>
              </div>
              <h3 className="text-[clamp(2.5rem,5vw,4rem)] leading-[0.85] font-black text-black mb-6 uppercase">WINS<br/>WALL</h3>
              <div className="space-y-4 mb-6">
                {[
                  { name: 'Alex Chen', win: 'Closed $50k deal!', emoji: '🎉' },
                  { name: 'Jamie Park', win: 'Shipped v2.0!', emoji: '🚀' },
                  { name: 'Alex Chen', win: 'Closed $50k deal!', emoji: '⭐' }
                ].map((item, i) => (
                  <div key={i} className="bg-brand-yellow/20 rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <p className="font-black text-black text-sm">{item.name}</p>
                      <p className="text-black/70 text-xs font-medium">{item.win}</p>
                    </div>
                    <span className="text-2xl">{item.emoji}</span>
                  </div>
                ))}
              </div>
              <button className="w-full bg-brand-orange text-white py-4 rounded-full text-base font-black hover:scale-105 transition-all uppercase">
                Share Win
              </button>
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-center gap-4 mb-8">
            <div className="h-2 bg-gradient-to-r from-brand-electric-blue via-brand-turquoise to-brand-yellow rounded-full flex-1"></div>
          </div>
          <h2 className="text-[clamp(2rem,4vw,4rem)] font-black text-white mb-8 uppercase tracking-tight">More Modules</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {/* Must Reads */}
            <div className="bg-gradient-to-br from-[#E56DB1] to-[#F498C6] p-8 md:p-10 rounded-[40px] hover:scale-105 transition-all duration-300 animate-slide-up">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-[#E56DB1]" />
                </div>
                <span className="text-black/60 font-black text-xs tracking-[0.2em] uppercase">Weekly</span>
              </div>
              <h3 className="text-[clamp(2.5rem,5vw,4rem)] leading-[0.85] font-black text-black mb-6 uppercase">MUST<br/>READS</h3>
              <div className="space-y-4">
                {[
                  { title: 'Design Systems 2024', author: 'By Emma Chen' },
                  { title: 'Better UX', author: 'By John Smith' }
                ].map((read, i) => (
                  <div key={i} className="bg-white/40 backdrop-blur-sm rounded-2xl p-4">
                    <p className="font-black text-black text-sm mb-1">{read.title}</p>
                    <p className="text-black/70 text-xs font-medium">{read.author}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Ask the Hive */}
            <div className="bg-gradient-to-br from-[#9B7EDE] to-[#B99EEB] p-8 md:p-10 rounded-[40px] hover:scale-105 transition-all duration-300 animate-slide-up">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-[#9B7EDE]" />
                </div>
                <span className="text-black/60 font-black text-xs tracking-[0.2em] uppercase">Community</span>
              </div>
              <h3 className="text-[clamp(2.5rem,5vw,4rem)] leading-[0.85] font-black text-black mb-6 uppercase">ASK THE<br/>HIVE</h3>
              <div className="space-y-4 mb-6">
                {[
                  { q: 'Best prototyping tool?', answers: '5 answers' },
                  { q: 'Handle difficult client?', answers: '12 answers' }
                ].map((item, i) => (
                  <div key={i} className="bg-white/40 backdrop-blur-sm rounded-2xl p-4">
                    <p className="font-black text-black text-sm mb-1">{item.q}</p>
                    <p className="text-black/70 text-xs font-medium">{item.answers}</p>
                  </div>
                ))}
              </div>
              <button className="w-full bg-black text-[#9B7EDE] py-4 rounded-full text-base font-black hover:scale-105 transition-all uppercase">
                Ask Question
              </button>
            </div>

            {/* Team Pulse */}
            <div className="bg-white p-8 md:p-10 rounded-[40px] hover:scale-105 transition-all duration-300 animate-slide-up">
              <div className="bg-brand-green px-4 py-2 rounded-full inline-block mb-4">
                <p className="text-black font-black text-xs tracking-[0.2em] uppercase">+85%</p>
              </div>
              <h3 className="text-[clamp(2.5rem,5vw,4rem)] leading-[0.85] font-black text-black mb-6 uppercase">Team Pulse</h3>
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-black text-sm">Happiness</span>
                    <span className="font-black text-black text-2xl">85</span>
                  </div>
                  <div className="h-3 bg-black/10 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-yellow rounded-full" style={{ width: '85%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-black text-sm">Energy</span>
                    <span className="font-black text-black text-2xl">72</span>
                  </div>
                  <div className="h-3 bg-black/10 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-orange rounded-full" style={{ width: '72%' }}></div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="bg-brand-green/10 rounded-2xl p-4">
                  <p className="text-xs font-bold text-brand-green uppercase mb-2">Excitements</p>
                  <p className="text-xs text-black/70 font-medium">New project kick-off</p>
                  <p className="text-xs text-black/70 font-medium">Team offsite soon</p>
                </div>
                <div className="bg-brand-coral/10 rounded-2xl p-4">
                  <p className="text-xs font-bold text-brand-coral uppercase mb-2">Frustrations</p>
                  <p className="text-xs text-black/70 font-medium">Too many meetings</p>
                  <p className="text-xs text-black/70 font-medium">Unclear priorities</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-center gap-4 mb-8">
            <div className="h-2 bg-gradient-to-r from-brand-electric-blue via-brand-purple to-brand-yellow rounded-full flex-1"></div>
          </div>
          <h2 className="text-[clamp(2rem,4vw,4rem)] font-black text-white mb-8 uppercase tracking-tight">Video & Inspiration</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            {/* Loom Standup (2-column span) */}
            <div className="lg:col-span-2 bg-gradient-to-br from-brand-electric-blue to-[#6B9EFF] p-8 md:p-10 rounded-[40px] hover:scale-105 transition-all duration-300 animate-slide-up">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center">
                  <Video className="w-6 h-6 text-brand-electric-blue" />
                </div>
                <span className="text-white/80 font-black text-xs tracking-[0.2em] uppercase">Daily</span>
              </div>
              <h3 className="text-[clamp(2.5rem,5vw,4rem)] leading-[0.85] font-black text-white mb-8 uppercase">LOOM<br/>STANDUP</h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { name: 'Alex', time: '3:22', color: 'brand-electric-blue', icon: Video },
                  { name: 'Sarah', time: '2:15', color: 'brand-purple', icon: Video },
                  { name: 'Mike', time: '4:01', color: 'brand-coral', icon: Video },
                  { name: 'Chris', time: '', color: 'black', icon: Users, status: 'On Leave' }
                ].map((person, i) => (
                  <div key={i} className={`bg-${person.status ? 'black/40' : 'brand-yellow'} rounded-3xl p-6 flex flex-col items-center justify-center text-center`}>
                    <div className={`w-16 h-16 bg-${person.color} rounded-2xl flex items-center justify-center mb-3`}>
                      <person.icon className="w-8 h-8 text-white" />
                    </div>
                    <p className="font-black text-black text-base">{person.name}</p>
                    {person.time ? (
                      <p className="text-xs text-black/70 font-medium">{person.time}</p>
                    ) : (
                      <p className="text-xs text-white/70 font-medium">{person.status}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Inspiration War */}
            <div className="bg-brand-yellow p-8 md:p-10 rounded-[40px] hover:scale-105 transition-all duration-300 animate-slide-up">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-brand-yellow" />
                </div>
                <span className="text-black/60 font-black text-xs tracking-[0.2em] uppercase">Today's Theme</span>
              </div>
              <h3 className="text-[clamp(2.5rem,5vw,4rem)] leading-[0.85] font-black text-black mb-6 uppercase">INSPIRATION<br/>WAR</h3>
              <div className="bg-brand-yellow/50 rounded-3xl p-6 mb-6 text-center">
                <p className="text-2xl font-black text-black">Retro Futurism</p>
              </div>
              <div className="grid grid-cols-4 gap-3 mb-6">
                {['-16', '-15', '-9', '-9'].map((score, i) => (
                  <div key={i} className="bg-brand-yellow/50 rounded-2xl p-4 flex flex-col items-center justify-center">
                    <span className="text-3xl mb-2">🎨</span>
                    <span className="text-sm font-black text-black">{score}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-black">🎨 24 entries</span>
                <span className="font-bold text-black">8h to vote</span>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-center gap-4 mb-8">
            <div className="h-2 bg-gradient-to-r from-brand-yellow to-brand-orange rounded-full flex-1"></div>
          </div>
          <h2 className="text-[clamp(2rem,4vw,4rem)] font-black text-white mb-8 uppercase tracking-tight">Browse Categories</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            {/* Categories */}
            <div className="bg-white p-8 md:p-10 rounded-[40px] hover:scale-105 transition-all duration-300 animate-slide-up">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-black/60 font-black text-xs tracking-[0.2em] uppercase">Browse</span>
              </div>
              <h3 className="text-[clamp(2.5rem,5vw,4rem)] leading-[0.85] font-black text-black mb-8 uppercase">CATEGORIES</h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Comms', icon: MessageCircle, color: 'brand-electric-blue' },
                  { label: 'Creative', icon: Sparkles, color: 'brand-coral' },
                  { label: 'Learn', icon: Star, color: 'brand-green' },
                  { label: 'Research', icon: Search, color: 'brand-orange' },
                  { label: 'Strategy', icon: TrendingUp, color: 'brand-orange-alt' },
                  { label: 'Tools', icon: Zap, color: 'black' }
                ].map((cat, i) => {
                  const Icon = cat.icon
                  return (
                    <button key={i} className={`bg-${cat.color} text-white py-5 rounded-3xl text-base font-black hover:scale-105 transition-all uppercase flex items-center justify-center gap-2`}>
                      <Icon className="w-5 h-5" />
                      {cat.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Search (2-column span) */}
            <div className="lg:col-span-2 bg-black p-8 md:p-10 rounded-[40px] border-4 border-brand-yellow hover:scale-105 transition-all duration-300 animate-slide-up">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-brand-yellow rounded-2xl flex items-center justify-center">
                  <Search className="w-6 h-6 text-black" />
                </div>
                <span className="text-brand-yellow font-black text-xs tracking-[0.2em] uppercase">Find Anything</span>
              </div>
              <h3 className="text-[clamp(2.5rem,5vw,4rem)] leading-[0.85] font-black text-white mb-8 uppercase">SEARCH</h3>
              <div className="relative">
                <Input 
                  placeholder="Resources, people, projects..." 
                  className="bg-white/10 border-2 border-white/20 text-white placeholder:text-white/40 h-16 pl-6 pr-20 rounded-full text-base font-bold"
                />
                <button className="absolute right-2 top-2 bg-brand-yellow hover:brightness-110 text-black w-12 h-12 rounded-full flex items-center justify-center hover:scale-110 transition-all">
                  <Search className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-black border-t border-white/10 py-12 px-4 md:px-6 lg:px-8">
        <div className="max-w-[2000px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-white font-black text-xl mb-4">Team Dashboard</h3>
            <p className="text-white/60 text-sm font-medium">Built with ❤️ and way too much coffee</p>
          </div>
          <div>
            <h4 className="text-brand-yellow font-black text-sm mb-4 uppercase tracking-wider">Totally Real Stats</h4>
            <p className="text-white/60 text-sm font-medium">347 cups of coffee consumed</p>
          </div>
          <div>
            <h4 className="text-brand-yellow font-black text-sm mb-4 uppercase tracking-wider">Fun Fact</h4>
            <p className="text-white/60 text-sm font-medium">We put the 'fun' in 'functional' and also in 'funnel', but that's unrelated.</p>
          </div>
          <div>
            <h4 className="text-brand-yellow font-black text-sm mb-4 uppercase tracking-wider">Good Morning</h4>
            <p className="text-white/60 text-sm font-medium">Time to make today awesome! After coffee.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
