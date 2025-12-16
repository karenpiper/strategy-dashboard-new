'use client'

import { useSnow } from '@/contexts/snow-context'
import { Button } from '@/components/ui/button'
import { Snowflake } from 'lucide-react'

export function SnowToggle() {
  const { snowEnabled, toggleSnow } = useSnow()

  return (
    <Button
      onClick={toggleSnow}
      variant="ghost"
      size="icon"
      className="w-10 h-10 rounded-full border border-zinc-700/50 hover:border-zinc-600 transition-all"
      aria-label={snowEnabled ? 'Turn off snow' : 'Turn on snow'}
      title={snowEnabled ? 'Turn off snow' : 'Turn on snow'}
    >
      <Snowflake 
        className={`w-4 h-4 transition-opacity ${snowEnabled ? 'opacity-100' : 'opacity-40'}`} 
      />
    </Button>
  )
}

