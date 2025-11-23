'use client'

import { useMode } from '@/contexts/mode-context'

export function Footer() {
  const { mode } = useMode()

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

  return (
    <footer className={`border-t pt-8 mt-12 ${getBorderClass()}`}>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div>
          <h3 className={`text-xl font-black mb-2 ${getTextClass()}`}>Team Dashboard</h3>
          <p className={`text-sm ${mode === 'chaos' ? 'text-[#666666]' : mode === 'chill' ? 'text-[#8B4444]' : 'text-[#808080]'}`}>Built with love and way too much coffee</p>
        </div>
        <div>
          <p className={`text-xs uppercase tracking-wider font-black mb-2 ${mode === 'chaos' ? 'text-[#666666]' : mode === 'chill' ? 'text-[#8B4444]' : 'text-[#808080]'}`}>Totally Real Stats</p>
          <p className={`text-sm ${mode === 'chaos' ? 'text-[#808080]' : mode === 'chill' ? 'text-[#8B4444]/80' : 'text-[#999999]'}`}>347 cups of coffee consumed</p>
          <p className={`text-sm ${mode === 'chaos' ? 'text-[#808080]' : mode === 'chill' ? 'text-[#8B4444]/80' : 'text-[#999999]'}`}>48 good vibes generated</p>
          <p className={`text-sm ${mode === 'chaos' ? 'text-[#808080]' : mode === 'chill' ? 'text-[#8B4444]/80' : 'text-[#999999]'}`}>100% team awesomeness</p>
        </div>
        <div>
          <p className={`text-xs uppercase tracking-wider font-black mb-2 ${mode === 'chaos' ? 'text-[#666666]' : mode === 'chill' ? 'text-[#8B4444]' : 'text-[#808080]'}`}>Fun Fact</p>
          <p className={`text-sm ${mode === 'chaos' ? 'text-[#808080]' : mode === 'chill' ? 'text-[#8B4444]/80' : 'text-[#999999]'}`}>We put the 'fun' in 'functional' and also in 'funnel', but we don't talk about that</p>
        </div>
        <div>
          <p className={`text-xs uppercase tracking-wider font-black mb-2 ${mode === 'chaos' ? 'text-[#666666]' : mode === 'chill' ? 'text-[#8B4444]' : 'text-[#808080]'}`}>Good Morning</p>
          <p className={`text-sm ${mode === 'chaos' ? 'text-[#808080]' : mode === 'chill' ? 'text-[#8B4444]/80' : 'text-[#999999]'}`}>Time to make today awesome! After coffee, obviously</p>
        </div>
      </div>
      <div className={`flex items-center justify-between text-xs pt-6 border-t ${getBorderClass()}`} style={{ color: mode === 'chaos' ? '#666666' : mode === 'chill' ? '#8B4444' : '#808080' }}>
        <p>© 2025 Team Dashboard. Made with questionable decisions and great intentions.</p>
        <div className="flex items-center gap-4">
          <a href="#" className={`transition-colors ${mode === 'chaos' ? 'hover:text-[#808080]' : mode === 'chill' ? 'hover:text-[#8B4444]/80' : 'hover:text-[#999999]'}`}>Privacy lol we're a team!</a>
          <a href="#" className={`transition-colors ${mode === 'chaos' ? 'hover:text-[#808080]' : mode === 'chill' ? 'hover:text-[#8B4444]/80' : 'hover:text-[#999999]'}`}>Terms just be cool</a>
          <a href="#" className={`transition-colors ${mode === 'chaos' ? 'hover:text-[#808080]' : mode === 'chill' ? 'hover:text-[#8B4444]/80' : 'hover:text-[#999999]'}`}>Contact we're right here</a>
        </div>
      </div>
      <p className={`text-center text-[10px] mt-4 ${mode === 'chaos' ? 'text-[#666666]' : mode === 'chill' ? 'text-[#8B4444]/70' : 'text-[#666666]'}`}>v1.2.3-beta-test.beta</p>
    </footer>
  )
}

