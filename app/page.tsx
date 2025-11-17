import { Search, Calendar, Music, FileText, MessageCircle, Trophy, TrendingUp, Users, Zap, Star, Heart, Coffee, Lightbulb, ChevronRight, Play, CheckCircle, Clock, ArrowRight, Video, Sparkles } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

export default function TeamDashboard() {
  return (
    <div className="min-h-screen bg-black text-white font-[family-name:var(--font-raleway)]">
      <header className="border-b border-zinc-800/50 px-6 py-4">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="w-10 h-10 bg-[#E8FF00] rounded-xl flex items-center justify-center font-black text-black text-lg">
              D
            </div>
            <nav className="flex items-center gap-6 text-sm font-bold">
              <a href="#" className="text-white hover:text-[#E8FF00] transition-colors">HOME</a>
              <a href="#" className="text-zinc-500 hover:text-white transition-colors">SNAPS</a>
              <a href="#" className="text-zinc-500 hover:text-white transition-colors">RESOURCES</a>
              <a href="#" className="text-zinc-500 hover:text-white transition-colors">WORK</a>
              <a href="#" className="text-zinc-500 hover:text-white transition-colors">TEAM</a>
              <a href="#" className="text-zinc-500 hover:text-white transition-colors">VIBES</a>
            </nav>
          </div>
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full border-2 border-purple-400/30" />
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-10">
        <section className="mb-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="bg-gradient-to-br from-[#FFB84D] via-[#FF8A5C] to-[#FF6B9D] text-black p-0 rounded-3xl col-span-1 lg:col-span-2 border-0 relative overflow-hidden group hover:scale-[1.02] transition-all">
              <div className="absolute top-0 right-0 w-[55%] h-full bg-black" 
                   style={{
                     clipPath: 'polygon(25% 0, 100% 0, 100% 100%, 0 100%)'
                   }} 
              />
              <div className="relative z-10 p-8">
                <Badge className="bg-black text-white hover:bg-black border-0 font-bold mb-4 text-xs uppercase tracking-wide">Quick Actions</Badge>
                <h1 className="text-7xl md:text-8xl font-black mb-4 leading-none tracking-tight">READY!</h1>
                <p className="text-xl font-semibold max-w-md text-black">
                  Let's ship something amazing today
                </p>
                <p className="text-sm font-medium text-black/70 mt-3">Friday, November 14</p>
                <div className="flex items-center gap-3 mt-6 flex-wrap">
                  <Button className="bg-black hover:bg-zinc-900 text-white font-bold rounded-2xl h-12 px-6">
                    Give Snap <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <Button className="bg-black hover:bg-zinc-900 text-white font-bold rounded-2xl h-12 px-6">
                    Need Help <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <Button className="bg-black hover:bg-zinc-900 text-white font-bold rounded-2xl h-12 px-6">
                    Add Win <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="bg-zinc-900 border border-zinc-700 p-8 rounded-3xl flex flex-col justify-center hover:scale-[1.02] transition-all">
              <div className="w-12 h-12 bg-[#E8FF00] rounded-2xl flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-black" />
              </div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold mb-2">Launch Pad</p>
              <h2 className="text-4xl font-black text-white leading-tight">Quick Actions</h2>
            </Card>
          </div>
        </section>

        <p className="text-xs text-zinc-600 uppercase tracking-widest font-bold mb-6 flex items-center gap-2">
          <span className="w-8 h-px bg-zinc-800"></span>
          Personalized Information
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="bg-gradient-to-br from-purple-600 to-purple-700 border-0 p-6 rounded-3xl hover:scale-[1.02] transition-all">
            <div className="flex items-center gap-2 text-sm mb-3 text-[#E8FF00]">
              <Sparkles className="w-4 h-4" />
              <span className="uppercase tracking-wide font-bold text-xs">Totally Real</span>
            </div>
            <h2 className="text-4xl font-black mb-6 text-[#E8FF00]">YOUR<br/>HOROSCOPE</h2>
            <div className="bg-purple-800/50 backdrop-blur-sm rounded-2xl p-4 border border-purple-500/30">
              <p className="text-sm font-bold text-[#E8FF00] mb-2">CANCER</p>
              <p className="text-white text-sm leading-relaxed">Mars aligns with your keyboard. Expect typos. So many typos. Idk stars have speelin.</p>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-sky-400 to-blue-500 border-0 p-6 rounded-3xl relative overflow-hidden hover:scale-[1.02] transition-all">
            <div className="flex items-center gap-2 text-sm mb-3 text-white/90 relative z-10">
              <span className="uppercase tracking-wide font-bold text-xs">Right Now</span>
            </div>
            <h2 className="text-4xl font-black text-white mb-4 relative z-10">WEATHER</h2>
            <div className="mb-6 relative z-10">
              <p className="text-7xl font-black text-white mb-2">72°</p>
              <p className="text-white text-lg font-bold">Partly Cloudy</p>
              <p className="text-sm text-white/80 font-medium">Your Location</p>
            </div>
            <div className="absolute bottom-20 right-8 text-white/20 text-9xl">☁️</div>
            <div className="grid grid-cols-2 gap-3 relative z-10">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                <p className="text-xs text-white/90 font-bold uppercase tracking-wide">Humidity</p>
                <p className="text-2xl font-black text-white">65%</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                <p className="text-xs text-white/90 font-bold uppercase tracking-wide">Wind</p>
                <p className="text-2xl font-black text-white">8 mph</p>
              </div>
            </div>
          </Card>

          <Card className="bg-zinc-900 border border-sky-500 p-6 rounded-3xl hover:scale-[1.02] transition-all">
            <div className="flex items-center gap-2 text-sm mb-3 text-sky-400">
              <Clock className="w-4 h-4" />
              <span className="uppercase tracking-wide font-bold text-xs">Global Team</span>
            </div>
            <h2 className="text-4xl font-black text-white mb-6">TIME<br/>ZONES</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-blue-500 rounded-xl hover:bg-blue-600 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center text-base">🌉</div>
                  <div>
                    <p className="text-white font-bold text-sm">San Francisco</p>
                    <p className="text-xs text-white/70 font-medium">2 people</p>
                  </div>
                </div>
                <span className="text-white font-black text-sm">12:50 AM</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-600 rounded-xl hover:bg-green-700 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center text-base">🗽</div>
                  <div>
                    <p className="text-white font-bold text-sm">New York</p>
                    <p className="text-xs text-white/70 font-medium">5 people</p>
                  </div>
                </div>
                <span className="text-white font-black text-sm">03:50 AM</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-600 rounded-xl hover:bg-purple-700 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center text-base">🏰</div>
                  <div>
                    <p className="text-white font-bold text-sm">London</p>
                    <p className="text-xs text-white/70 font-medium">3 people</p>
                  </div>
                </div>
                <span className="text-white font-black text-sm">08:50 AM</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-pink-600 rounded-xl hover:bg-pink-700 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center text-base">🗼</div>
                  <div>
                    <p className="text-white font-bold text-sm">Tokyo</p>
                    <p className="text-xs text-white/70 font-medium">1 person</p>
                  </div>
                </div>
                <span className="text-white font-black text-sm">05:50 PM</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-orange-600 rounded-xl hover:bg-orange-700 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center text-base">🌏</div>
                  <div>
                    <p className="text-white font-bold text-sm">Sydney</p>
                    <p className="text-xs text-white/70 font-medium">4 people</p>
                  </div>
                </div>
                <span className="text-white font-black text-sm">07:50 PM</span>
              </div>
            </div>
          </Card>
        </div>

        <p className="text-xs text-zinc-600 uppercase tracking-widest font-bold mb-6 flex items-center gap-2">
          <span className="w-8 h-px bg-zinc-800"></span>
          Work Updates
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 border-0 p-6 rounded-3xl hover:scale-[1.02] transition-all">
            <div className="flex items-center gap-2 text-sm mb-3 text-black">
              <Music className="w-4 h-4" />
              <span className="uppercase tracking-wide font-bold text-xs">Weekly</span>
            </div>
            <h2 className="text-3xl font-black text-black mb-4">PLAYLIST</h2>
            <div className="flex items-center justify-center mb-4">
              <div className="w-20 h-20 bg-black rounded-2xl flex items-center justify-center">
                <Music className="w-10 h-10 text-orange-500" />
              </div>
            </div>
            <p className="text-black font-bold text-sm mb-1">Coding Vibes</p>
            <p className="text-black/70 text-xs mb-4">Curated by Alex</p>
            <Button className="w-full bg-black hover:bg-zinc-900 text-white font-bold rounded-xl h-10 text-sm">
              <Play className="w-4 h-4 mr-2" /> Play on Spotify
            </Button>
          </Card>

          <Card className="bg-gradient-to-br from-teal-500 to-cyan-600 border-0 p-6 rounded-3xl hover:scale-[1.02] transition-all">
            <div className="flex items-center gap-2 text-sm mb-3 text-black">
              <FileText className="w-4 h-4" />
              <span className="uppercase tracking-wide font-bold text-xs">Weekly Report</span>
            </div>
            <h2 className="text-3xl font-black text-black mb-6">THE<br/>FRIDAY<br/>DROP</h2>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-black/10 backdrop-blur-sm rounded-xl p-3 border border-black/10 text-center">
                <p className="text-3xl font-black text-black">5</p>
                <p className="text-xs text-black/70 font-bold uppercase tracking-wide">New</p>
              </div>
              <div className="bg-black/10 backdrop-blur-sm rounded-xl p-3 border border-black/10 text-center">
                <p className="text-3xl font-black text-black">8</p>
                <p className="text-xs text-black/70 font-bold uppercase tracking-wide">Shipped</p>
              </div>
              <div className="bg-black/10 backdrop-blur-sm rounded-xl p-3 border border-black/10 text-center">
                <p className="text-3xl font-black text-black">12</p>
                <p className="text-xs text-black/70 font-bold uppercase tracking-wide">In QA</p>
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-pink-400 to-pink-500 border-0 p-6 rounded-3xl relative overflow-hidden hover:scale-[1.02] transition-all">
            <Badge className="bg-black text-white border-0 font-bold mb-3 text-xs uppercase tracking-wide">Featured</Badge>
            <div className="mb-4">
              <p className="text-sm text-black/70 font-medium mb-1">Active Drop</p>
              <h3 className="text-2xl font-black text-black">Brand Redesign</h3>
              <Badge className="bg-black/20 text-black border-0 font-bold mt-2 text-xs">Branding</Badge>
            </div>
            <div className="absolute bottom-4 right-4 text-8xl opacity-20">🎨</div>
            <ChevronRight className="absolute bottom-4 right-4 w-6 h-6 text-black" />
          </Card>

          <Card className="bg-white border-0 p-6 rounded-3xl hover:scale-[1.02] transition-all">
            <p className="text-xs uppercase tracking-wide text-zinc-600 mb-2 font-bold">This Month</p>
            <h2 className="text-3xl font-black text-black mb-6">STATS</h2>
            <div className="space-y-4">
              <div>
                <p className="text-5xl font-black text-black">24</p>
                <p className="text-sm text-zinc-600 font-bold">Team</p>
              </div>
              <div>
                <p className="text-5xl font-black text-black">247</p>
                <p className="text-sm text-zinc-600 font-bold">Snaps</p>
              </div>
              <div>
                <p className="text-5xl font-black text-emerald-500">+15%</p>
                <p className="text-sm text-zinc-600 font-bold">Growth</p>
              </div>
            </div>
          </Card>
        </div>

        <p className="text-xs text-zinc-600 uppercase tracking-widest font-bold mb-6 flex items-center gap-2">
          <span className="w-8 h-px bg-zinc-800"></span>
          Work Updates Continued
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="bg-zinc-900 border border-teal-500 p-6 rounded-3xl hover:scale-[1.02] transition-all">
            <div className="flex items-center gap-2 text-sm mb-3 text-teal-400">
              <Calendar className="w-4 h-4" />
              <span className="uppercase tracking-wide font-bold text-xs">Today</span>
            </div>
            <h2 className="text-4xl font-black text-white mb-6">EVENTS</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-teal-900/30 border border-teal-700/50 rounded-xl">
                <Clock className="w-4 h-4 text-teal-400" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-white">10:30 Team Standup</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-teal-900/30 border border-teal-700/50 rounded-xl">
                <Clock className="w-4 h-4 text-teal-400" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-white">14:00 Design Review</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="bg-[#6FD89C] border-0 p-6 rounded-3xl hover:scale-[1.02] transition-all">
            <p className="text-xs uppercase tracking-wide text-black/70 mb-2 font-bold">Work</p>
            <h2 className="text-4xl font-black text-black mb-6">PIPELINE</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-black/80 border border-black rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#E8FF00] rounded-lg flex items-center justify-center">
                    <FileText className="w-4 h-4 text-black" />
                  </div>
                  <span className="text-white font-bold text-sm">New Business</span>
                </div>
                <span className="text-2xl font-black text-[#E8FF00]">12</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-black/80 border border-black rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-white font-bold text-sm">In Progress</span>
                </div>
                <span className="text-2xl font-black text-purple-300">8</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-black/80 border border-black rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#6FD89C] rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-black" />
                  </div>
                  <span className="text-white font-bold text-sm">Completed</span>
                </div>
                <span className="text-2xl font-black text-[#6FD89C]">24</span>
              </div>
            </div>
          </Card>

          <Card className="bg-[#E8FF00] border-0 p-6 rounded-3xl hover:scale-[1.02] transition-all">
            <Badge className="bg-black text-[#E8FF00] border-0 font-bold mb-3 text-xs uppercase tracking-wide">Recent Requests</Badge>
            <h2 className="text-4xl font-black text-black mb-6">WHO<br/>NEEDS<br/>WHAT</h2>
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between p-3 bg-black rounded-xl">
                <div>
                  <p className="text-sm font-black text-white">Alex</p>
                  <p className="text-xs text-zinc-400">Design Review</p>
                </div>
                <div className="w-8 h-8 bg-[#E8FF00] rounded-full flex items-center justify-center">
                  <span className="text-lg">👀</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-black rounded-xl">
                <div>
                  <p className="text-sm font-black text-white">Sarah</p>
                  <p className="text-xs text-zinc-400">Code Help</p>
                </div>
                <div className="w-8 h-8 bg-[#E8FF00] rounded-full flex items-center justify-center">
                  <span className="text-lg">💻</span>
                </div>
              </div>
            </div>
            <Button className="w-full bg-black hover:bg-zinc-900 text-white font-bold rounded-xl h-12">
              CLAIM REQUEST
            </Button>
          </Card>
        </div>

        <p className="text-xs text-zinc-600 uppercase tracking-widest font-bold mb-6 flex items-center gap-2">
          <span className="w-8 h-px bg-zinc-800"></span>
          Recognition & Culture
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
          <Card className="lg:col-span-2 bg-zinc-900 border border-purple-500 p-8 rounded-3xl hover:scale-[1.02] transition-all">
            <div className="flex items-center gap-2 text-sm mb-3 text-purple-400">
              <Sparkles className="w-4 h-4" />
              <span className="uppercase tracking-wide font-bold text-xs">Recent Recognition</span>
            </div>
            <h2 className="text-6xl font-black text-[#E8FF00] mb-8">SNAPS</h2>
            <div className="space-y-3 mb-6">
              <div className="bg-zinc-800/50 backdrop-blur-sm rounded-xl p-5 border border-zinc-700/50 hover:border-[#E8FF00]/50 transition-all">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-lg flex-shrink-0">👍</div>
                  <div className="flex-1">
                    <p className="font-bold text-white text-sm mb-1">
                      <span className="font-black">Alex</span> <span className="text-zinc-500">→</span> <span className="font-black">Jamie</span>
                    </p>
                    <p className="text-zinc-300 text-sm leading-relaxed">Amazing presentation! The client loved it</p>
                  </div>
                </div>
              </div>
              <div className="bg-zinc-800/50 backdrop-blur-sm rounded-xl p-5 border border-zinc-700/50 hover:border-[#E8FF00]/50 transition-all">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center text-lg flex-shrink-0">🙌</div>
                  <div className="flex-1">
                    <p className="font-bold text-white text-sm mb-1">
                      <span className="font-black">Sarah</span> <span className="text-zinc-500">→</span> <span className="font-black">Mike</span>
                    </p>
                    <p className="text-zinc-300 text-sm leading-relaxed">Thanks for the code review help today</p>
                  </div>
                </div>
              </div>
              <div className="bg-zinc-800/50 backdrop-blur-sm rounded-xl p-5 border border-zinc-700/50 hover:border-[#E8FF00]/50 transition-all">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-pink-500 rounded-lg flex items-center justify-center text-lg flex-shrink-0">⭐</div>
                  <div className="flex-1">
                    <p className="font-bold text-white text-sm mb-1">
                      <span className="font-black">Chris</span> <span className="text-zinc-500">→</span> <span className="font-black">Taylor</span>
                    </p>
                    <p className="text-zinc-300 text-sm leading-relaxed">Great design work on the new landing page</p>
                  </div>
                </div>
              </div>
            </div>
            <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-black rounded-xl h-14 text-base">
              + GIVE A SNAP
            </Button>
          </Card>

          <div className="space-y-6">
            <Card className="bg-gradient-to-br from-red-500 to-pink-600 border-0 p-6 rounded-3xl hover:scale-[1.02] transition-all">
              <p className="text-xs uppercase tracking-wide text-white/80 mb-2 font-bold">This Week's</p>
              <h2 className="text-4xl font-black text-white mb-6">BEAST<br/>BABE</h2>
              <div className="flex items-center justify-center mb-4">
                <div className="w-20 h-20 bg-[#E8FF00] rounded-full flex items-center justify-center">
                  <Trophy className="w-10 h-10 text-black" />
                </div>
              </div>
              <p className="text-2xl font-black text-white text-center">Sarah J.</p>
              <p className="text-sm text-white/90 text-center font-medium">42 Snaps Received</p>
            </Card>

            <Card className="bg-white border-0 p-6 rounded-3xl hover:scale-[1.02] transition-all">
              <div className="flex items-center gap-2 text-sm mb-2 text-black">
                <Trophy className="w-4 h-4" />
                <span className="uppercase tracking-wide font-bold text-xs">Celebrate</span>
              </div>
              <h2 className="text-4xl font-black text-black mb-4">WINS<br/>WALL</h2>
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-xl border border-orange-200">
                  <div>
                    <p className="text-sm font-black text-black">Alex Chen</p>
                    <p className="text-xs text-zinc-700 font-medium">Closed $50k deal!</p>
                  </div>
                  <span className="text-2xl">🎉</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-xl border border-orange-200">
                  <div>
                    <p className="text-sm font-black text-black">Jamie Park</p>
                    <p className="text-xs text-zinc-700 font-medium">Shipped v2.0!</p>
                  </div>
                  <span className="text-2xl">🚀</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-xl border border-orange-200">
                  <div>
                    <p className="text-sm font-black text-black">Alex Chen</p>
                    <p className="text-xs text-zinc-700 font-medium">Closed $50k deal!</p>
                  </div>
                  <span className="text-2xl">⭐</span>
                </div>
              </div>
              <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl h-12">
                Share Win
              </Button>
            </Card>
          </div>
        </div>

        <p className="text-xs text-zinc-600 uppercase tracking-widest font-bold mb-6 flex items-center gap-2">
          <span className="w-8 h-px bg-zinc-800"></span>
          More Modules
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="bg-gradient-to-br from-pink-300 to-pink-400 border-0 p-6 rounded-3xl hover:scale-[1.02] transition-all">
            <div className="flex items-center gap-2 text-sm mb-3 text-black">
              <FileText className="w-4 h-4" />
              <span className="uppercase tracking-wide font-bold text-xs">Weekly</span>
            </div>
            <h2 className="text-3xl font-black text-black mb-6">MUST<br/>READS</h2>
            <div className="space-y-3">
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/40">
                <p className="text-sm font-black text-black mb-1">Design Systems 2024</p>
                <p className="text-xs text-pink-900 font-medium">By Emma Chen</p>
              </div>
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/40">
                <p className="text-sm font-black text-black mb-1">Better UX</p>
                <p className="text-xs text-pink-900 font-medium">By John Smith</p>
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-purple-300 to-purple-400 border-0 p-6 rounded-3xl hover:scale-[1.02] transition-all">
            <div className="flex items-center gap-2 text-sm mb-3 text-black">
              <MessageCircle className="w-4 h-4" />
              <span className="uppercase tracking-wide font-bold text-xs">Community</span>
            </div>
            <h2 className="text-3xl font-black text-black mb-6">ASK THE<br/>HIVE</h2>
            <div className="space-y-3 mb-4">
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/40">
                <p className="text-sm font-bold text-black mb-1">Best prototyping tool?</p>
                <p className="text-xs text-purple-900 font-medium">5 answers</p>
              </div>
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/40">
                <p className="text-sm font-bold text-black mb-1">Handle difficult client?</p>
                <p className="text-xs text-purple-900 font-medium">12 answers</p>
              </div>
            </div>
            <Button className="w-full bg-black hover:bg-zinc-900 text-white font-bold rounded-xl h-10 text-sm">
              Ask Question
            </Button>
          </Card>

          <Card className="bg-white border-0 p-6 rounded-3xl hover:scale-[1.02] transition-all">
            <Badge className="bg-emerald-500 text-white border-0 font-bold mb-4 text-xs">+85%</Badge>
            <h2 className="text-3xl font-black text-black mb-6">Team Pulse</h2>
            <div className="space-y-4 mb-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-black">Happiness</p>
                  <p className="text-2xl font-black text-black">85</p>
                </div>
                <div className="w-full bg-zinc-200 rounded-full h-2">
                  <div className="bg-[#E8FF00] h-2 rounded-full" style={{ width: '85%' }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-black">Energy</p>
                  <p className="text-2xl font-black text-black">72</p>
                </div>
                <div className="w-full bg-zinc-200 rounded-full h-2">
                  <div className="bg-orange-500 h-2 rounded-full" style={{ width: '72%' }} />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200">
                <p className="text-xs text-emerald-700 font-bold uppercase tracking-wide mb-1">Excitements</p>
                <ul className="text-xs text-emerald-900 space-y-1">
                  <li>• New project kick-off</li>
                  <li>• Team offsite soon</li>
                </ul>
              </div>
              <div className="bg-pink-50 rounded-xl p-3 border border-pink-200">
                <p className="text-xs text-pink-700 font-bold uppercase tracking-wide mb-1">Frustrations</p>
                <ul className="text-xs text-pink-900 space-y-1">
                  <li>• Too many meetings</li>
                  <li>• Unclear priorities</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <Card className="bg-gradient-to-br from-blue-500 to-purple-600 border-0 p-6 rounded-3xl hover:scale-[1.02] transition-all">
            <div className="flex items-center gap-2 text-sm mb-3 text-white">
              <Video className="w-4 h-4" />
              <span className="uppercase tracking-wide font-bold text-xs">Daily</span>
            </div>
            <h2 className="text-4xl font-black text-white mb-6">LOOM<br/>STANDUP</h2>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-[#E8FF00] rounded-2xl p-4 flex flex-col items-center justify-center hover:scale-105 transition-transform cursor-pointer">
                <div className="w-16 h-16 bg-blue-500 rounded-xl flex items-center justify-center mb-2">
                  <Video className="w-8 h-8 text-white" />
                </div>
                <p className="text-xs font-black text-black">Alex</p>
                <p className="text-xs text-zinc-700">3:22</p>
              </div>
              <div className="bg-[#E8FF00] rounded-2xl p-4 flex flex-col items-center justify-center hover:scale-105 transition-transform cursor-pointer">
                <div className="w-16 h-16 bg-purple-500 rounded-xl flex items-center justify-center mb-2">
                  <Video className="w-8 h-8 text-white" />
                </div>
                <p className="text-xs font-black text-black">Sarah</p>
                <p className="text-xs text-zinc-700">2:15</p>
              </div>
              <div className="bg-[#E8FF00] rounded-2xl p-4 flex flex-col items-center justify-center hover:scale-105 transition-transform cursor-pointer">
                <div className="w-16 h-16 bg-pink-500 rounded-xl flex items-center justify-center mb-2">
                  <Video className="w-8 h-8 text-white" />
                </div>
                <p className="text-xs font-black text-black">Mike</p>
                <p className="text-xs text-zinc-700">4:01</p>
              </div>
              <div className="bg-black/80 rounded-2xl p-4 flex flex-col items-center justify-center hover:scale-105 transition-transform cursor-pointer border border-white/20">
                <div className="w-16 h-16 bg-zinc-700 rounded-xl flex items-center justify-center mb-2">
                  <Users className="w-8 h-8 text-zinc-400" />
                </div>
                <p className="text-xs font-black text-white">Chris</p>
                <p className="text-xs text-zinc-400">On Leave</p>
              </div>
            </div>
          </Card>

          <Card className="bg-[#E8FF00] border-0 p-8 rounded-3xl hover:scale-[1.02] transition-all">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 text-sm mb-2 text-black">
                  <Lightbulb className="w-4 h-4" />
                  <span className="uppercase tracking-wide font-bold text-xs">Today's Theme</span>
                </div>
                <h2 className="text-4xl font-black text-black">INSPIRATION<br/>WAR</h2>
              </div>
              <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-[#E8FF00]" />
              </div>
            </div>
            <div className="bg-black/10 backdrop-blur-sm rounded-2xl p-4 border border-black/10 mb-6">
              <p className="text-black font-bold text-lg text-center">Retro Futurism</p>
            </div>
            <div className="grid grid-cols-4 gap-3 mb-6">
              {[16, 15, 9, 9].map((votes, i) => (
                <div key={i} className="bg-yellow-300/50 backdrop-blur-sm rounded-2xl p-4 border border-black/10 flex flex-col items-center justify-center hover:bg-yellow-300/70 transition-all cursor-pointer group">
                  <div className="text-3xl mb-1 group-hover:scale-110 transition-transform">🎨</div>
                  <p className="text-xs text-black font-bold">~{votes}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between text-sm">
              <p className="text-black font-bold">🎨 24 entries</p>
              <p className="text-black font-bold">8h to vote</p>
            </div>
          </Card>
        </div>

        <p className="text-xs text-zinc-600 uppercase tracking-widest font-bold mb-6 flex items-center gap-2">
          <span className="w-8 h-px bg-zinc-800"></span>
          Browse Categories
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <Card className="bg-white border-0 p-6 rounded-3xl hover:scale-[1.02] transition-all">
            <p className="text-xs uppercase tracking-wide text-zinc-600 mb-2 font-bold">Browse</p>
            <h2 className="text-4xl font-black text-black mb-6">CATEGORIES</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Button className="bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl h-16">
                <MessageCircle className="w-5 h-5 mr-2" />
                Comms
              </Button>
              <Button className="bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl h-16">
                <Lightbulb className="w-5 h-5 mr-2" />
                Creative
              </Button>
              <Button className="bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl h-16">
                <Star className="w-5 h-5 mr-2" />
                Learn
              </Button>
              <Button className="bg-orange-700 hover:bg-orange-800 text-white font-bold rounded-xl h-16">
                <Search className="w-5 h-5 mr-2" />
                Research
              </Button>
              <Button className="bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl h-16">
                <Lightbulb className="w-5 h-5 mr-2" />
                Strategy
              </Button>
              <Button className="bg-black hover:bg-zinc-900 text-white font-bold rounded-xl h-16">
                <Zap className="w-5 h-5 mr-2" />
                Tools
              </Button>
            </div>
          </Card>

          <Card className="bg-zinc-900 border border-zinc-700 p-6 rounded-3xl hover:scale-[1.02] transition-all">
            <div className="flex items-center gap-2 text-sm mb-3 text-zinc-500">
              <Search className="w-4 h-4" />
              <span className="uppercase tracking-wide font-bold text-xs">Find Anything</span>
            </div>
            <h2 className="text-4xl font-black text-white mb-6">SEARCH</h2>
            <div className="relative">
              <Input 
                placeholder="Resources, people, projects..."
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 rounded-xl h-14 pr-14 font-medium"
              />
              <Button className="absolute right-2 top-2 bg-[#E8FF00] hover:bg-[#d4e600] text-black rounded-lg h-10 w-10 p-0">
                <Search className="w-5 h-5" />
              </Button>
            </div>
          </Card>
        </div>

        <footer className="border-t border-zinc-800 pt-8 mt-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div>
              <h3 className="text-xl font-black text-white mb-2">Team Dashboard</h3>
              <p className="text-sm text-zinc-500">Built with love and way too much coffee</p>
            </div>
            <div>
              <p className="text-xs text-zinc-600 uppercase tracking-wider font-bold mb-2">Totally Real Stats</p>
              <p className="text-sm text-zinc-400">347 cups of coffee consumed</p>
              <p className="text-sm text-zinc-400">48 good vibes generated</p>
              <p className="text-sm text-zinc-400">100% team awesomeness</p>
            </div>
            <div>
              <p className="text-xs text-zinc-600 uppercase tracking-wider font-bold mb-2">Fun Fact</p>
              <p className="text-sm text-zinc-400">We put the 'fun' in 'functional' and also in 'funnel', but we don't talk about that</p>
            </div>
            <div>
              <p className="text-xs text-zinc-600 uppercase tracking-wider font-bold mb-2">Good Morning</p>
              <p className="text-sm text-zinc-400">Time to make today awesome! After coffee, obviously</p>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-zinc-600 pt-6 border-t border-zinc-800">
            <p>© 2025 Team Dashboard. Made with questionable decisions and great intentions.</p>
            <div className="flex items-center gap-4">
              <a href="#" className="hover:text-zinc-400 transition-colors">Privacy lol we're a team!</a>
              <a href="#" className="hover:text-zinc-400 transition-colors">Terms just be cool</a>
              <a href="#" className="hover:text-zinc-400 transition-colors">Contact we're right here</a>
            </div>
          </div>
          <p className="text-center text-[10px] text-zinc-700 mt-4">v1.2.3-beta-test.beta</p>
        </footer>
      </main>
    </div>
  )
}
