'use client'

import { Card } from '@/components/ui/card'
import { Music, Sparkles, Cloud, FileText, BarChart3, Settings, TrendingUp } from 'lucide-react'
import Link from 'next/link'

export default function AdminDashboard() {
  const sections = [
    {
      title: 'Playlists',
      description: 'Manage Spotify playlists and tracks',
      icon: Music,
      href: '/admin/playlists',
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Horoscopes',
      description: 'Configure horoscope settings and styles',
      icon: Sparkles,
      href: '/admin/horoscopes',
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: 'Weather',
      description: 'Manage weather settings and location',
      icon: Cloud,
      href: '/admin/weather',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Content Cards',
      description: 'Edit Friday Drop, Featured, Stats, and other cards',
      icon: FileText,
      href: '/admin/content',
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
    {
      title: 'Stats & Metrics',
      description: 'View and manage dashboard statistics',
      icon: BarChart3,
      href: '/admin/stats',
      color: 'text-pink-500',
      bgColor: 'bg-pink-500/10',
    },
    {
      title: 'Settings',
      description: 'General settings and configuration',
      icon: Settings,
      href: '/admin/settings',
      color: 'text-gray-500',
      bgColor: 'bg-gray-500/10',
    },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage all content and settings for the dashboard</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sections.map((section) => {
          const Icon = section.icon
          return (
            <Link key={section.href} href={section.href}>
              <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer h-full">
                <div className={`w-12 h-12 ${section.bgColor} ${section.color} rounded-lg flex items-center justify-center mb-4`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-semibold text-foreground mb-2">{section.title}</h2>
                <p className="text-sm text-muted-foreground">{section.description}</p>
              </Card>
            </Link>
          )
        })}
      </div>

      {/* Quick Stats */}
      <div className="mt-8">
        <h2 className="text-2xl font-semibold text-foreground mb-4">Quick Stats</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Playlists</p>
                <p className="text-2xl font-bold text-foreground">1</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Horoscope Configs</p>
                <p className="text-2xl font-bold text-foreground">-</p>
              </div>
              <Sparkles className="w-8 h-8 text-purple-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Content Cards</p>
                <p className="text-2xl font-bold text-foreground">6+</p>
              </div>
              <FileText className="w-8 h-8 text-orange-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Last Updated</p>
                <p className="text-sm font-medium text-foreground">Today</p>
              </div>
              <Settings className="w-8 h-8 text-gray-500" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

