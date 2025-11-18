'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Save } from 'lucide-react'

export default function SettingsAdmin() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">Settings</h1>
        <p className="text-muted-foreground">General settings and configuration</p>
      </div>

      <Card className="p-6">
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-4">General Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Site Title</label>
                <Input placeholder="Strategy Dashboard" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Default Location</label>
                <Input placeholder="New York, NY" />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <Button size="lg">
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

