'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { useMode } from '@/contexts/mode-context'
import { SiteHeader } from '@/components/site-header'
import { Footer } from '@/components/footer'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

// Poll data
const pollData = {
  totalPeople: 14,
  totalMentions: 49,
  uniqueItems: 42,
  items: [
    { name: 'Stuffing', count: 7, category: 'classic' },
    { name: 'Mashed potatoes', count: 3, category: 'classic' },
    { name: 'Peking duck', count: 2, category: 'global' },
    { name: 'Pumpkin pie', count: 2, category: 'classic' },
    { name: 'Gravy', count: 2, category: 'classic' },
    { name: 'Fried turkey', count: 1, category: 'classic' },
    { name: 'Turkey breast', count: 1, category: 'classic' },
    { name: 'Peppercorn encrusted filet mignon', count: 1, category: 'global' },
    { name: 'Outdoor KBBQ', count: 1, category: 'global' },
    { name: 'Chicken biriyani', count: 1, category: 'global' },
    { name: 'Jollof rice', count: 1, category: 'global' },
    { name: 'Arepas', count: 1, category: 'global' },
    { name: 'Empanadas', count: 1, category: 'global' },
    { name: 'Ham', count: 1, category: 'classic' },
    { name: 'Funeral potatoes', count: 1, category: 'classic' },
    { name: 'Cornbread', count: 1, category: 'classic' },
    { name: 'Corn soufflé', count: 1, category: 'classic' },
    { name: 'Fire-roasted sweet potatoes', count: 1, category: 'classic' },
    { name: 'Butternut squash', count: 1, category: 'classic' },
    { name: 'Sweet potato pie', count: 1, category: 'classic' },
    { name: 'Caramel custard', count: 1, category: 'classic' },
    { name: 'Custard pie', count: 1, category: 'classic' },
    { name: 'Dessert spread', count: 1, category: 'ritual' },
    { name: 'Dots candy', count: 1, category: 'ritual' },
    { name: 'Trolli exploding worms', count: 1, category: 'ritual' },
    { name: 'White Monster', count: 1, category: 'ritual' },
    { name: 'Eggnog', count: 1, category: 'ritual' },
    { name: 'Appetizer red wine', count: 1, category: 'ritual' },
    { name: 'Dinner red wine', count: 1, category: 'ritual' },
    { name: 'Dessert amaro', count: 1, category: 'ritual' },
    { name: 'Peanut butter whiskey "during gravy"', count: 1, category: 'ritual' },
    { name: 'Skinny French cigarette', count: 1, category: 'ritual' },
    { name: 'Capri cigarettes with my mother in law and great aunt', count: 1, category: 'ritual' },
    { name: 'Caviar before dinner', count: 1, category: 'ritual' },
    { name: 'Cheese plate before', count: 1, category: 'ritual' },
    { name: 'All of the above mixed together in one perfect bite', count: 1, category: 'ritual' },
    { name: 'Green bean casserole', count: 1, category: 'classic' },
    { name: 'Horseradish mashed potatoes', count: 1, category: 'classic' },
    { name: 'Hongshaorou', count: 1, category: 'global' },
  ],
  turkeyMentions: 2,
  globalMains: [
    { name: 'Peking duck', count: 2 },
    { name: 'Peppercorn encrusted filet mignon', count: 1 },
    { name: 'Outdoor KBBQ', count: 1 },
    { name: 'Chicken biriyani', count: 1 },
    { name: 'Jollof rice', count: 1 },
    { name: 'Arepas', count: 1 },
    { name: 'Empanadas', count: 1 },
    { name: 'Ham', count: 1 },
  ],
  carbs: [
    { name: 'Stuffing', count: 7 },
    { name: 'Mashed potatoes', count: 3 },
    { name: 'Funeral potatoes', count: 1 },
    { name: 'Cornbread', count: 1 },
    { name: 'Corn soufflé', count: 1 },
    { name: 'Fire-roasted sweet potatoes', count: 1 },
    { name: 'Butternut squash', count: 1 },
  ],
  desserts: [
    { name: 'Pumpkin pie', count: 2 },
    { name: 'Sweet potato pie', count: 1 },
    { name: 'Caramel custard', count: 1 },
    { name: 'Custard pie', count: 1 },
    { name: 'Dessert spread', count: 1 },
    { name: 'Dots candy', count: 1 },
    { name: 'Trolli exploding worms', count: 1 },
  ],
}

export default function ThanksgivingPollPage() {
  const { user, loading: authLoading } = useAuth()
  const { mode } = useMode()
  const router = useRouter()
  const [visibleSection, setVisibleSection] = useState(0)

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

  const getAccentColor = () => {
    return mode === 'chaos' ? '#C4F500' : mode === 'chill' ? '#FFC043' : '#FFFFFF'
  }

  const getSecondaryColor = () => {
    return mode === 'chaos' ? '#FFD700' : mode === 'chill' ? '#FFB5D8' : '#CCCCCC'
  }

  useEffect(() => {
    if (!user && !authLoading) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Bar Chart Component
  const BarChart = ({ data, maxValue, height = 400 }: { data: Array<{ name: string; count: number }>, maxValue: number, height?: number }) => {
    const barWidth = 40
    const spacing = 10
    const chartHeight = height
    const chartWidth = data.length * (barWidth + spacing)

    return (
      <div className="overflow-x-auto">
        <svg width={Math.max(chartWidth, 800)} height={chartHeight + 100} className="w-full">
          {data.map((item, index) => {
            const barHeight = (item.count / maxValue) * chartHeight
            const x = index * (barWidth + spacing) + 50
            const y = chartHeight - barHeight
            const isStuffing = item.name === 'Stuffing'
            
            return (
              <g key={item.name}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill={isStuffing ? getAccentColor() : getSecondaryColor()}
                  opacity={isStuffing ? 1 : 0.6}
                  className="transition-all duration-1000"
                  style={{ animation: `fadeInUp 0.6s ease-out ${index * 0.1}s both` }}
                />
                <text
                  x={x + barWidth / 2}
                  y={chartHeight + 20}
                  textAnchor="middle"
                  className={`text-xs ${getTextClass()}`}
                  fill={mode === 'chaos' ? '#FFFFFF' : mode === 'chill' ? '#4A1818' : '#FFFFFF'}
                  transform={`rotate(-45 ${x + barWidth / 2} ${chartHeight + 20})`}
                  style={{ fontSize: '10px' }}
                >
                  {item.name.length > 15 ? item.name.substring(0, 12) + '...' : item.name}
                </text>
                <text
                  x={x + barWidth / 2}
                  y={y - 5}
                  textAnchor="middle"
                  className={`text-sm font-black ${getTextClass()}`}
                  fill={isStuffing ? getAccentColor() : getSecondaryColor()}
                >
                  {item.count}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    )
  }

  // Comparison Chart - Turkey vs Global Mains
  const TurkeyComparisonChart = () => {
    const turkeyData = [{ name: 'Turkey', count: pollData.turkeyMentions }]
    const globalData = pollData.globalMains
    const maxValue = Math.max(...globalData.map(d => d.count), pollData.turkeyMentions)
    
    return (
      <div className="space-y-8">
        <div>
          <h4 className={`text-lg font-black mb-4 ${getTextClass()}`}>Turkey Mentions</h4>
          <BarChart data={turkeyData} maxValue={maxValue} height={200} />
        </div>
        <div>
          <h4 className={`text-lg font-black mb-4 ${getTextClass()}`}>Global Mains</h4>
          <BarChart data={globalData} maxValue={maxValue} height={200} />
        </div>
      </div>
    )
  }

  // Category Breakdown
  const CategoryBreakdown = () => {
    const categories = {
      classic: pollData.items.filter(i => i.category === 'classic').length,
      global: pollData.items.filter(i => i.category === 'global').length,
      ritual: pollData.items.filter(i => i.category === 'ritual').length,
    }
    const total = Object.values(categories).reduce((a, b) => a + b, 0)
    const size = 200
    const centerX = size / 2
    const centerY = size / 2
    const radius = size / 2 - 20

    let currentAngle = -90 // Start at top

    const colors = {
      classic: mode === 'chaos' ? '#C4F500' : mode === 'chill' ? '#FFC043' : '#FFFFFF',
      global: mode === 'chaos' ? '#FFD700' : mode === 'chill' ? '#FFB5D8' : '#CCCCCC',
      ritual: mode === 'chaos' ? '#00A3E0' : mode === 'chill' ? '#8B4444' : '#999999',
    }

    return (
      <div className="flex flex-col items-center">
        <svg width={size} height={size} className="mb-6">
          {Object.entries(categories).map(([category, count]) => {
            const percentage = (count / total) * 100
            const angle = (percentage / 100) * 360
            const endAngle = currentAngle + angle

            const x1 = centerX + radius * Math.cos((currentAngle * Math.PI) / 180)
            const y1 = centerY + radius * Math.sin((currentAngle * Math.PI) / 180)
            const x2 = centerX + radius * Math.cos((endAngle * Math.PI) / 180)
            const y2 = centerY + radius * Math.sin((endAngle * Math.PI) / 180)
            const largeArc = angle > 180 ? 1 : 0

            const pathData = [
              `M ${centerX} ${centerY}`,
              `L ${x1} ${y1}`,
              `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
              'Z'
            ].join(' ')

            const labelAngle = currentAngle + angle / 2
            const labelRadius = radius * 0.7
            const labelX = centerX + labelRadius * Math.cos((labelAngle * Math.PI) / 180)
            const labelY = centerY + labelRadius * Math.sin((labelAngle * Math.PI) / 180)

            const result = (
              <g key={category}>
                <path
                  d={pathData}
                  fill={colors[category as keyof typeof colors]}
                  opacity={0.8}
                  className="transition-all duration-1000"
                />
                <text
                  x={labelX}
                  y={labelY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className={`text-sm font-black ${getTextClass()}`}
                  fill={mode === 'chaos' ? '#000000' : mode === 'chill' ? '#4A1818' : '#FFFFFF'}
                >
                  {Math.round(percentage)}%
                </text>
              </g>
            )

            currentAngle = endAngle
            return result
          })}
        </svg>
        <div className="flex gap-6">
          {Object.entries(categories).map(([category, count]) => (
            <div key={category} className="text-center">
              <div 
                className="w-4 h-4 rounded-full mx-auto mb-2"
                style={{ backgroundColor: colors[category as keyof typeof colors] }}
              />
              <div className={`text-sm font-black uppercase ${getTextClass()}`}>{category}</div>
              <div className={`text-xs ${getTextClass()} opacity-70`}>{count} items</div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (authLoading || !user) {
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

      <main className="max-w-[1200px] mx-auto px-6 py-10 flex-1 pt-24">
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
              Thanksgiving Grub
            </h1>
            <p className={`text-xl ${getTextClass()} opacity-70 mb-8`}>
              {pollData.totalPeople} people, {pollData.totalMentions} mentions, {pollData.uniqueItems} unique items. Complete menu chaos in the best way.
            </p>
            <p className={`text-lg ${getTextClass()} opacity-60 mb-8`}>
              The Thanksgiving poll that proves stuffing bangs.
            </p>
            {/* Hero Image - Thanksgiving table chaos */}
            <div className="relative w-full h-96 rounded-3xl overflow-hidden mb-8">
              <img
                src="https://images.unsplash.com/photo-1606914469633-bd39206ea372?w=1200&h=600&fit=crop"
                alt="Thanksgiving table with diverse foods"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            </div>
          </div>

          {/* Opening Stats */}
          <section className="mb-20">
            <p className={`text-lg leading-relaxed mb-8 ${getTextClass()}`}>
              If you dropped into this Thanksgiving poll with no context, you might think it was for a very chaotic, very hungry, very international reality show.
            </p>
            <p className={`text-lg leading-relaxed mb-8 ${getTextClass()}`}>
              On paper, it is simple: {pollData.totalPeople} people, {pollData.totalMentions} total mentions, {pollData.uniqueItems} unique items. In practice, it is complete menu chaos in the best way.
            </p>

            {/* Top Items Bar Chart */}
            <div className="my-12 p-8 rounded-3xl" style={{ backgroundColor: mode === 'chaos' ? 'rgba(255, 255, 255, 0.05)' : mode === 'chill' ? 'rgba(74, 24, 24, 0.05)' : 'rgba(255, 255, 255, 0.05)' }}>
              <h3 className={`text-2xl font-black mb-6 ${getTextClass()}`}>All Items by Frequency</h3>
              <BarChart 
                data={pollData.items.filter(i => i.count > 1).sort((a, b) => b.count - a.count)} 
                maxValue={7}
                height={300}
              />
            </div>

            <p className={`text-lg leading-relaxed mb-4 ${getTextClass()}`}>
              Stuffing shows up the most. Seven different people say it. That is almost half the group. Statistically speaking, stuffing runs this channel.
            </p>
            <p className={`text-lg leading-relaxed mb-4 ${getTextClass()}`}>
              After that, everything falls off fast. Mashed potatoes get three shoutouts. Peking duck gets two. Pumpkin pie gets two. Gravy gets two. The rest is a long list of one-offs that feel very "this is my thing, do not touch it."
            </p>
            <p className={`text-lg leading-relaxed mb-4 font-black ${getTextClass()}`} style={{ color: getAccentColor() }}>
              So yes. Clearly stuffing bangs. The data said it, not me.
            </p>
            {/* Stuffing GIF */}
            <div className="my-8 flex justify-center">
              <div style={{ width: '100%', maxWidth: '500px' }}>
                <iframe
                  src="https://giphy.com/embed/3o7aD2saCpv7kXhqGc"
                  width="100%"
                  height="300"
                  frameBorder="0"
                  className="giphy-embed rounded-2xl"
                  allowFullScreen
                />
              </div>
            </div>
          </section>

          {/* Turkey vs Global Mains */}
          <section className="mb-20">
            <h2 className={`text-4xl font-black uppercase mb-6 ${getTextClass()}`}>Turkey is Optional, Vibes are Not</h2>
            {/* Turkey image - small and sad */}
            <div className="my-8 flex justify-center">
              <div className="relative w-64 h-48 rounded-2xl overflow-hidden opacity-50">
                <img
                  src="https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400&h=300&fit=crop"
                  alt="Roasted turkey"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <p className={`text-lg leading-relaxed mb-8 ${getTextClass()}`}>
              Turkey is supposed to be the star of Thanksgiving. Here, it is a side character with bad agent representation.
            </p>
            <p className={`text-lg leading-relaxed mb-4 ${getTextClass()}`}>
              Mentions of turkey:
            </p>
            <ul className={`list-disc list-inside mb-8 ${getTextClass()}`}>
              <li>"Fried turkey"</li>
              <li>"Turkey breast"</li>
            </ul>
            <p className={`text-lg leading-relaxed mb-8 ${getTextClass()}`}>
              That is it. Two tiny entries out of {pollData.totalMentions} answers.
            </p>

            <div className="my-12 p-8 rounded-3xl" style={{ backgroundColor: mode === 'chaos' ? 'rgba(255, 255, 255, 0.05)' : mode === 'chill' ? 'rgba(74, 24, 24, 0.05)' : 'rgba(255, 255, 255, 0.05)' }}>
              <TurkeyComparisonChart />
            </div>

            <p className={`text-lg leading-relaxed mb-4 ${getTextClass()}`}>
              Now look at what people actually center:
            </p>
            <ul className={`list-disc list-inside mb-8 ${getTextClass()}`}>
              {pollData.globalMains.map(main => (
                <li key={main.name}>{main.name}</li>
              ))}
            </ul>
            <p className={`text-lg leading-relaxed mb-4 ${getTextClass()}`}>
              If you graph this, turkey is in the corner while the rest of the mains are throwing a block party. The "traditional" American bird gets outvoted by global comfort food.
            </p>
            {/* Global foods collage */}
            <div className="my-8 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="relative w-full h-32 rounded-xl overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=300&h=300&fit=crop"
                  alt="Peking duck"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="relative w-full h-32 rounded-xl overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=300&h=300&fit=crop"
                  alt="Biryani"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="relative w-full h-32 rounded-xl overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=300&h=300&fit=crop"
                  alt="Jollof rice"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="relative w-full h-32 rounded-xl overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1615367427258-0a1d3c3b8b4e?w=300&h=300&fit=crop"
                  alt="Empanadas"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            {/* Block party GIF */}
            <div className="my-8 flex justify-center">
              <div style={{ width: '100%', maxWidth: '400px' }}>
                <iframe
                  src="https://giphy.com/embed/l0MYC0LajVboX2Xva"
                  width="100%"
                  height="250"
                  frameBorder="0"
                  className="giphy-embed rounded-2xl"
                  allowFullScreen
                />
              </div>
            </div>
          </section>

          {/* Carbs Section */}
          <section className="mb-20">
            <h2 className={`text-4xl font-black uppercase mb-6 ${getTextClass()}`}>Carbs are Non-Negotiable</h2>
            {/* Carbs hero image */}
            <div className="my-8 relative w-full h-64 rounded-3xl overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1604909052743-94e838986d24?w=1200&h=600&fit=crop"
                alt="Thanksgiving carbs - stuffing, mashed potatoes, bread"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            </div>
            <div className="my-12 p-8 rounded-3xl" style={{ backgroundColor: mode === 'chaos' ? 'rgba(255, 255, 255, 0.05)' : mode === 'chill' ? 'rgba(74, 24, 24, 0.05)' : 'rgba(255, 255, 255, 0.05)' }}>
              <h3 className={`text-2xl font-black mb-6 ${getTextClass()}`}>Carb Breakdown</h3>
              <BarChart 
                data={pollData.carbs.sort((a, b) => b.count - a.count)} 
                maxValue={7}
                height={250}
              />
            </div>
            <p className={`text-lg leading-relaxed mb-4 ${getTextClass()}`}>
              This group treats starchy things like non-negotiable. No one is out here ranking salad.
            </p>
            {/* Salad rejection GIF */}
            <div className="my-8 flex justify-center">
              <div style={{ width: '100%', maxWidth: '400px' }}>
                <iframe
                  src="https://giphy.com/embed/l0MYC0LajVboX2Xva"
                  width="100%"
                  height="250"
                  frameBorder="0"
                  className="giphy-embed rounded-2xl"
                  allowFullScreen
                />
              </div>
            </div>
          </section>

          {/* Desserts Section */}
          <section className="mb-20">
            <h2 className={`text-4xl font-black uppercase mb-6 ${getTextClass()}`}>Desserts are Pure Personality</h2>
            {/* Dessert split image - pie vs candy */}
            <div className="my-8 grid grid-cols-2 gap-4">
              <div className="relative w-full h-64 rounded-2xl overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1606312619070-d48b4bc89db8?w=600&h=600&fit=crop"
                  alt="Pumpkin pie"
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-4 left-4 right-4">
                  <p className={`text-sm font-black ${getTextClass()} bg-black/70 px-3 py-1 rounded`}>Grandma's Pie</p>
                </div>
              </div>
              <div className="relative w-full h-64 rounded-2xl overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1606312619070-d48b4bc89db8?w=600&h=600&fit=crop"
                  alt="Gummy worms"
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-4 left-4 right-4">
                  <p className={`text-sm font-black ${getTextClass()} bg-black/70 px-3 py-1 rounded`}>Gas Station Candy</p>
                </div>
              </div>
            </div>
            <div className="my-12 p-8 rounded-3xl" style={{ backgroundColor: mode === 'chaos' ? 'rgba(255, 255, 255, 0.05)' : mode === 'chill' ? 'rgba(74, 24, 24, 0.05)' : 'rgba(255, 255, 255, 0.05)' }}>
              <BarChart 
                data={pollData.desserts.sort((a, b) => b.count - a.count)} 
                maxValue={2}
                height={200}
              />
            </div>
            <p className={`text-lg leading-relaxed mb-4 ${getTextClass()}`}>
              You have grandma-level heirloom pies sitting next to gas station gummy worms. That is the vibe. Very "I contain multitudes and most of them have corn syrup."
            </p>
            {/* Multitudes GIF */}
            <div className="my-8 flex justify-center">
              <div style={{ width: '100%', maxWidth: '400px' }}>
                <iframe
                  src="https://giphy.com/embed/3o7aD2saCpv7kXhqGc"
                  width="100%"
                  height="250"
                  frameBorder="0"
                  className="giphy-embed rounded-2xl"
                  allowFullScreen
                />
              </div>
            </div>
          </section>

          {/* Category Breakdown */}
          <section className="mb-20">
            <h2 className={`text-4xl font-black uppercase mb-6 ${getTextClass()}`}>Three Buckets of Chaos</h2>
            <p className={`text-lg leading-relaxed mb-8 ${getTextClass()}`}>
              If we pretend we are building a Pudding-style data story, you can slice this tiny dataset into three big buckets.
            </p>
            {/* Ritual items image - wine, cigarettes, etc */}
            <div className="my-8 relative w-full h-80 rounded-3xl overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=1200&h=600&fit=crop"
                alt="Thanksgiving rituals - wine, food, family"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <p className={`text-lg font-black ${getTextClass()}`}>Rituals: Wine flights, cigarettes, caviar, and "all of the above mixed together"</p>
              </div>
            </div>
            <div className="my-12 p-8 rounded-3xl" style={{ backgroundColor: mode === 'chaos' ? 'rgba(255, 255, 255, 0.05)' : mode === 'chill' ? 'rgba(74, 24, 24, 0.05)' : 'rgba(255, 255, 255, 0.05)' }}>
              <CategoryBreakdown />
            </div>
          </section>

          {/* Conclusion */}
          <section className="mb-20">
            <h2 className={`text-4xl font-black uppercase mb-6 ${getTextClass()}`}>The Takeaway</h2>
            {/* Group chat / personality test image */}
            <div className="my-8 relative w-full h-96 rounded-3xl overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1606914469633-bd39206ea372?w=1200&h=600&fit=crop"
                alt="Diverse Thanksgiving table"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            </div>
            <p className={`text-lg leading-relaxed mb-4 ${getTextClass()}`}>
              The official story of Thanksgiving is still turkey, cranberry sauce, and some glossy picture of a perfect table. This poll shows what actually happens when real people answer honestly.
            </p>
            <p className={`text-lg leading-relaxed mb-4 ${getTextClass()}`}>
              The menu turns into a group chat.
            </p>
            <p className={`text-lg leading-relaxed mb-4 ${getTextClass()}`}>
              The data turns into a personality test.
            </p>
            <p className={`text-lg leading-relaxed mb-4 font-black ${getTextClass()}`} style={{ color: getAccentColor() }}>
              And stuffing, obviously, bangs.
            </p>
            {/* Final stuffing celebration GIF */}
            <div className="my-8 flex justify-center">
              <div style={{ width: '100%', maxWidth: '500px' }}>
                <iframe
                  src="https://giphy.com/embed/3o7aD2saCpv7kXhqGc"
                  width="100%"
                  height="300"
                  frameBorder="0"
                  className="giphy-embed rounded-2xl"
                  allowFullScreen
                />
              </div>
            </div>
          </section>
        </article>

        <Footer />
      </main>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}

