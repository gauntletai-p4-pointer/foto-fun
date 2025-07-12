'use client'

import React from 'react'
import { ToolOptions } from '../ToolOptions'
import { useAsyncService } from '@/lib/core/AppInitializer'
import type { EventToolStore } from '@/lib/store/tools/EventToolStore'

export function OptionsBar() {
  const { service: toolStore } = useAsyncService<EventToolStore>('ToolStore')
  
  if (!toolStore) {
    return <div className="h-12 bg-background border-b border-border" />
  }

  return (
    <div className="h-12 bg-background border-b border-border flex items-center px-4 gap-4">
      <ToolOptions />
    </div>
  )
} 