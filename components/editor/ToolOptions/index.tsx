'use client'

import React from 'react'
import { useService } from '@/lib/core/AppInitializer'
import type { EventToolStore } from '@/lib/store/tools/EventToolStore'

export function ToolOptions() {
  const toolStore = useService<EventToolStore>('ToolStore')
  
  if (!toolStore) {
    return null
  }

  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-gray-600">Tool options will be displayed here</span>
    </div>
  )
} 