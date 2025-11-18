'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Save } from 'lucide-react'

export default function ContentAdmin() {
  const [fridayDrop, setFridayDrop] = useState({
    new: '5',
    shipped: '8',
    inQa: '12',
  })

  const [featured, setFeatured] = useState({
    title: 'BRAND REDESIGN',
    category: 'Branding',
  })

  const [stats, setStats] = useState({
    team: '24',
    snaps: '247',
    growth: '+15%',
  })

  const [events, setEvents] = useState([
    { time: '10:30 Team Standup' },
    { time: '14:00 Design Review' },
  ])

  const [pipeline, setPipeline] = useState({
    newBusiness: '12',
    inProgress: '8',
    completed: '24',
  })

  const handleSave = () => {
    // TODO: Save to database/API
    console.log('Saving content:', { fridayDrop, featured, stats, events, pipeline })
    alert('Content saved! (This will connect to your backend)')
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">Manage Content Cards</h1>
        <p className="text-muted-foreground">Edit Friday Drop, Featured, Stats, Events, and Pipeline cards</p>
      </div>

      <div className="space-y-6">
        {/* Friday Drop */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Friday Drop</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">New</label>
              <Input
                value={fridayDrop.new}
                onChange={(e) => setFridayDrop({ ...fridayDrop, new: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Shipped</label>
              <Input
                value={fridayDrop.shipped}
                onChange={(e) => setFridayDrop({ ...fridayDrop, shipped: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">In QA</label>
              <Input
                value={fridayDrop.inQa}
                onChange={(e) => setFridayDrop({ ...fridayDrop, inQa: e.target.value })}
              />
            </div>
          </div>
        </Card>

        {/* Featured */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Featured Card</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Title</label>
              <Input
                value={featured.title}
                onChange={(e) => setFeatured({ ...featured, title: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Category</label>
              <Input
                value={featured.category}
                onChange={(e) => setFeatured({ ...featured, category: e.target.value })}
              />
            </div>
          </div>
        </Card>

        {/* Stats */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Stats Card</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Team</label>
              <Input
                value={stats.team}
                onChange={(e) => setStats({ ...stats, team: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Snaps</label>
              <Input
                value={stats.snaps}
                onChange={(e) => setStats({ ...stats, snaps: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Growth</label>
              <Input
                value={stats.growth}
                onChange={(e) => setStats({ ...stats, growth: e.target.value })}
              />
            </div>
          </div>
        </Card>

        {/* Pipeline */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Pipeline</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">New Business</label>
              <Input
                value={pipeline.newBusiness}
                onChange={(e) => setPipeline({ ...pipeline, newBusiness: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">In Progress</label>
              <Input
                value={pipeline.inProgress}
                onChange={(e) => setPipeline({ ...pipeline, inProgress: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Completed</label>
              <Input
                value={pipeline.completed}
                onChange={(e) => setPipeline({ ...pipeline, completed: e.target.value })}
              />
            </div>
          </div>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} size="lg">
            <Save className="w-4 h-4 mr-2" />
            Save All Changes
          </Button>
        </div>
      </div>
    </div>
  )
}

