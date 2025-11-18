'use client'

import { Card } from '@/components/ui/card'
import { TrendingUp, Users, FileText, Music } from 'lucide-react'

export default function StatsAdmin() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">Stats & Metrics</h1>
        <p className="text-muted-foreground">View dashboard statistics and analytics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Playlists</p>
              <p className="text-3xl font-bold text-foreground mt-2">1</p>
            </div>
            <Music className="w-8 h-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Content Cards</p>
              <p className="text-3xl font-bold text-foreground mt-2">6+</p>
            </div>
            <FileText className="w-8 h-8 text-orange-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active Users</p>
              <p className="text-3xl font-bold text-foreground mt-2">-</p>
            </div>
            <Users className="w-8 h-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Growth</p>
              <p className="text-3xl font-bold text-foreground mt-2">+15%</p>
            </div>
            <TrendingUp className="w-8 h-8 text-pink-500" />
          </div>
        </Card>
      </div>

      <Card className="p-6 mt-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">Analytics Dashboard</h2>
        <p className="text-muted-foreground">Detailed analytics and reporting coming soon...</p>
      </Card>
    </div>
  )
}

