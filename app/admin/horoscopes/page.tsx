'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function HoroscopesAdmin() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">Horoscope Configuration</h1>
        <p className="text-muted-foreground">Manage horoscope styles, rules, and settings</p>
      </div>

      <Card className="p-6">
        <p className="text-muted-foreground">Horoscope configuration management coming soon...</p>
        <p className="text-sm text-muted-foreground mt-2">
          This section will allow you to manage:
        </p>
        <ul className="list-disc list-inside text-sm text-muted-foreground mt-4 space-y-1">
          <li>Horoscope styles and themes</li>
          <li>Rules and segment matching</li>
          <li>Image generation settings</li>
          <li>Character types and weights</li>
        </ul>
      </Card>
    </div>
  )
}

