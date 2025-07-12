'use client'

import React from 'react'
import { useAsyncService } from '@/lib/core/AppInitializer'
import type { EventToolStore } from '@/lib/store/tools/EventToolStore'
import { Badge } from '@/components/ui/badge'

export function ToolOptions() {
  const { service: toolStore } = useAsyncService<EventToolStore>('ToolStore')
  
  if (!toolStore) {
    return null
  }

  const activeTool = toolStore.getActiveTool()
  
  if (!activeTool) {
    return null
  }

  return (
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <Badge variant="secondary" className="capitalize">
        {activeTool.toolId.replace(/-/g, ' ')}
      </Badge>
      {/* TODO: Add tool-specific options here */}
    </div>
  )
}
