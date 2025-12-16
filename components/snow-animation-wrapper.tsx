'use client'

import { useSnow } from '@/contexts/snow-context'
import { SnowAnimation } from '@/components/snow-animation'

export function SnowAnimationWrapper() {
  const { snowEnabled } = useSnow()
  return <SnowAnimation enabled={snowEnabled} />
}

